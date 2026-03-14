#!/usr/bin/env node
"use strict";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SCAN_CHANNELS = (process.env.SCAN_CHANNELS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REPORT_CHANNEL = process.env.REPORT_CHANNEL;
const SCAN_DAYS = parseInt(process.env.SCAN_DAYS || "7", 10);

// ---------------------------------------------------------------------------
// Slack API helpers
// ---------------------------------------------------------------------------

async function slackGet(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://slack.com/api/${endpoint}?${qs}`, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack ${endpoint}: ${data.error}`);
  return data;
}

async function slackPost(endpoint, body) {
  const res = await fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack ${endpoint}: ${data.error}`);
  return data;
}

// ---------------------------------------------------------------------------
// Fetch channel history + thread replies
// ---------------------------------------------------------------------------

async function fetchHistory(channelId, oldest) {
  const messages = [];
  let cursor;
  do {
    const params = { channel: channelId, oldest, limit: "200" };
    if (cursor) params.cursor = cursor;
    const data = await slackGet("conversations.history", params);
    messages.push(...(data.messages || []));
    cursor = data.response_metadata?.next_cursor;
  } while (cursor);

  return messages;
}

async function fetchReplies(channelId, threadTs) {
  try {
    const data = await slackGet("conversations.replies", {
      channel: channelId,
      ts: threadTs,
      limit: "200",
    });
    return (data.messages || []).slice(1); // skip parent
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Resolve user IDs → display names
// ---------------------------------------------------------------------------

async function buildUserMap() {
  try {
    const data = await slackGet("users.list", { limit: "200" });
    const map = {};
    for (const u of data.members || []) {
      map[u.id] = u.real_name || u.name;
    }
    return map;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Format messages into readable text
// ---------------------------------------------------------------------------

function formatMessages(messages, userMap) {
  return messages
    .sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
    .map((m) => {
      const user = userMap[m.user] || m.user || "bot";
      const date = new Date(parseFloat(m.ts) * 1000).toLocaleDateString(
        "ja-JP",
        { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }
      );
      const text = (m.text || "").replace(
        /<@(\w+)>/g,
        (_, id) => `@${userMap[id] || id}`
      );
      return `[${date}] ${user}: ${text}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Gemini analysis
// ---------------------------------------------------------------------------

async function analyzeWithGemini(formattedMessages) {
  const prompt = `以下はSlackチャンネルの直近${SCAN_DAYS}日間のメッセージです。これらのメッセージを分析し、**未消化のネクストアクション**を洗い出してください。

「ネクストアクション」とは:
- 誰かが「やります」「対応します」「確認します」と言ったが、完了報告がないもの
- 「〜してほしい」「〜お願いします」という依頼で、対応済みの報告がないもの
- 明示的なTODOやタスクの言及
- 期限付きの作業で、完了が確認できないもの

完了済み（「対応しました」「完了」「done」等の報告があるもの）は除外してください。

出力フォーマット:
• 各アイテムは箇条書きで
• 担当者がわかる場合は明記
• いつ言及されたかの日付を含める
• 見つからない場合は「未消化のアクションアイテムはありませんでした。」と返す

---
${formattedMessages}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const result = await res.json();
  return (
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "分析結果を取得できませんでした。"
  );
}

// ---------------------------------------------------------------------------
// Resolve channel name
// ---------------------------------------------------------------------------

async function getChannelName(channelId) {
  try {
    const data = await slackGet("conversations.info", { channel: channelId });
    return data.channel?.name || channelId;
  } catch {
    return channelId;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!SLACK_BOT_TOKEN) {
    console.error("SLACK_BOT_TOKEN is not set.");
    return;
  }
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
    return;
  }
  if (SCAN_CHANNELS.length === 0) {
    console.error("SCAN_CHANNELS is not set.");
    return;
  }

  const userMap = await buildUserMap();
  const oldest = String(
    Math.floor((Date.now() - SCAN_DAYS * 86400000) / 1000)
  );
  const reportTo = REPORT_CHANNEL || SCAN_CHANNELS[0];

  console.log(`Scan period: ${SCAN_DAYS} days, report to: ${reportTo}`);

  const sections = [];

  for (const channelId of SCAN_CHANNELS) {
    const channelName = await getChannelName(channelId);
    console.log(`Scanning #${channelName} (${channelId})...`);

    const history = await fetchHistory(channelId, oldest);
    console.log(`  ${history.length} messages found.`);

    if (history.length === 0) {
      sections.push(`*#${channelName}*\nメッセージがありませんでした。`);
      continue;
    }

    // Fetch thread replies
    const allMessages = [...history];
    const threaded = history.filter((m) => m.reply_count > 0);
    for (const msg of threaded) {
      const replies = await fetchReplies(channelId, msg.ts);
      allMessages.push(...replies);
    }
    console.log(`  ${allMessages.length} messages (incl. threads).`);

    const formatted = formatMessages(allMessages, userMap);

    // Truncate if too long (Gemini input limit)
    const maxChars = 100000;
    const truncated =
      formatted.length > maxChars
        ? formatted.slice(0, maxChars) + "\n...(truncated)"
        : formatted;

    const analysis = await analyzeWithGemini(truncated);
    sections.push(`*#${channelName}*\n${analysis}`);
    console.log(`  Analysis complete.`);
  }

  const report = [
    `:clipboard: *週次アクションアイテムレビュー*`,
    `対象期間: 直近 ${SCAN_DAYS} 日間\n`,
    ...sections,
  ].join("\n\n");

  await slackPost("chat.postMessage", { channel: reportTo, text: report });
  console.log(`Report posted to ${reportTo}.`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
