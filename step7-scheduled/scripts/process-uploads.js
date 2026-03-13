#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const UPLOAD_DIR = "/uploads";
const DONE_DIR = "/uploads/done";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_EXPENSE;

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".heic", ".pdf"];

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
};

const ANALYSIS_PROMPT = `あなたは経費仕訳の専門アシスタントです。レシート・領収書・請求書の画像を解析し、以下のJSON形式のみで回答してください。JSON以外のテキストは一切出力しないでください。個人情報（氏名・住所）はマスクしてください。

{
  "date": "YYYY/MM/DD",
  "store": "店名",
  "item": "品名",
  "total": "合計金額（税込、¥なし、数値のみ）",
  "tax": "消費税額（¥なし、数値のみ。不明なら空文字）",
  "payment": "支払方法（不明なら空文字）",
  "category": "勘定科目",
  "reason": "科目判定の理由（1-2文）"
}

勘定科目は以下から選択: 消耗品費/旅費交通費/接待交際費/会議費/通信費/新聞図書費/地代家賃/水道光熱費/外注費/広告宣伝費/福利厚生費/雑費
判定ルール: 10万円未満の物品→消耗品費`;

async function analyzeImage(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "image/jpeg";
  const imageData = fs.readFileSync(filepath).toString("base64");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: ANALYSIS_PROMPT },
              { inlineData: { mimeType, data: imageData } },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini API");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in response: ${text}`);

  return JSON.parse(jsonMatch[0]);
}

function writeToSpreadsheet(data) {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const values = [
    data.date,
    data.store,
    data.item,
    data.total,
    data.tax || "不明",
    data.payment || "不明",
    data.category,
    data.reason,
    now,
  ];

  const params = JSON.stringify({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
  });

  const json = JSON.stringify({ values: [values] });

  execSync(
    `gws sheets spreadsheets values append --params '${params}' --json '${json}'`,
    { stdio: "pipe" }
  );
}

async function postToSlack(filename, data) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) return;

  const message = [
    `*[定期処理] ${filename}*`,
    `日付: ${data.date}`,
    `店名: ${data.store}`,
    `品名: ${data.item}`,
    `合計: ${data.total}`,
    `科目: ${data.category}（${data.reason}）`,
    `スプレッドシートに記録しました。`,
  ].join("\n");

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: message }),
  });
}

async function processFile(filepath) {
  const filename = path.basename(filepath);
  console.log(`Processing: ${filename}`);

  const data = await analyzeImage(filepath);
  console.log(
    `  Analyzed: ${data.store} / ${data.item} / ${data.total} -> ${data.category}`
  );

  writeToSpreadsheet(data);
  console.log(`  Written to spreadsheet.`);

  await postToSlack(filename, data);
  console.log(`  Notified Slack.`);

  fs.renameSync(filepath, path.join(DONE_DIR, filename));
  console.log(`  Moved to done/.`);

  return data;
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. Skipping.");
    return;
  }
  if (!SPREADSHEET_ID) {
    console.error("GOOGLE_SHEETS_SPREADSHEET_ID is not set. Skipping.");
    return;
  }

  if (!fs.existsSync(DONE_DIR)) fs.mkdirSync(DONE_DIR, { recursive: true });

  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(UPLOAD_DIR, f));

  if (files.length === 0) {
    console.log("No files to process.");
    return;
  }

  console.log(`Found ${files.length} file(s) to process.`);

  let success = 0;
  let failed = 0;

  for (const filepath of files) {
    try {
      await processFile(filepath);
      success++;
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`Done. success=${success}, failed=${failed}`);
}

main().catch(console.error);
