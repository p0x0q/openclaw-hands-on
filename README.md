# OpenClaw Hands-on

OpenClaw を Docker 環境で安全に動かし、Slack と連携するまでのハンズオン資材です。

## ステップ構成

| ステップ | ディレクトリ | 内容 |
|---------|-------------|------|
| Step 1 | `step1-docker-setup/` | Docker + Anthropic API キーで OpenClaw を起動 |
| Step 2 | `step2-slack-integration/` | Slack App を作成し、OpenClaw と連携 |

各ステップは独立して動作します。step1 → step2 の順に進めてください。

## 前提条件

| 要件 | 詳細 |
|------|------|
| Docker Desktop or Docker Engine | 最新安定版 |
| Docker Compose | v2 以上（`docker compose` コマンド形式） |
| メモリ | 2GB 以上 |
| ディスク | 5GB 以上の空き |
| Anthropic API キー | [Anthropic Console](https://console.anthropic.com/) で発行 |

Node.js のホスト側インストールは不要です。

## クイックスタート（Step 1）

```bash
cd step1-docker-setup

# .env を作成し、API キーを設定
cp .env.example .env
vi .env  # ANTHROPIC_API_KEY を設定

# 起動
make deploy

# 動作確認
make status
make doctor
```

ブラウザで http://localhost:18789/ にアクセスするか、ターミナルからチャットできます。

```bash
# TUI でチャット
make chat

# ワンショットで質問
make ask MSG="Hello, what can you do?"
```

## クイックスタート（Step 2）

Step 1 が動作確認できたら、Slack 連携に進みます。

```bash
cd step2-slack-integration

# .env を作成し、API キー + Slack トークンを設定
cp .env.example .env
vi .env

# 起動
make deploy

# Slack 接続状況を確認
make channels
```

Slack App の作成手順は `step2-slack-integration/configs/channelManifest/app-manifest.json` を Slack App 設定画面の「App Manifest」に貼り付けて使います。

## ディレクトリ構成

```
openclaw-hands-on/
├── README.md
├── .gitignore
├── step1-docker-setup/
│   ├── docker-compose.yml          # Anthropic API のみのシンプル構成
│   ├── configs/
│   │   ├── openclaw.json           # エージェント設定（Slack なし）
│   │   └── agents/                 # カスタムエージェント定義（任意）
│   ├── .env.example
│   └── Makefile
└── step2-slack-integration/
    ├── docker-compose.yml          # Slack 環境変数を追加した構成
    ├── configs/
    │   ├── openclaw.json           # Slack チャネル + バインディング設定
    │   ├── agents/
    │   └── channelManifest/
    │       └── app-manifest.json   # Slack App Manifest（コピペ用）
    ├── scripts/
    │   └── setup-slack.sh          # Slack セットアップスクリプト
    ├── .env.example
    └── Makefile
```

## step1 と step2 の差分

step1 をベースに、step2 では以下が追加されています。

| ファイル | 変更内容 |
|---------|---------|
| `docker-compose.yml` | `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` の環境変数、init コンテナに `envsubst` 追加 |
| `configs/openclaw.json` | `channels.slack` と `bindings` セクションを追加 |
| `configs/channelManifest/` | Slack App Manifest（新規） |
| `scripts/setup-slack.sh` | Slack チャネル追加スクリプト（新規） |
| `Makefile` | `setup-slack` / `channels` ターゲット追加 |
| `.env.example` | Slack トークン 2 種を追加 |

## Makefile コマンド一覧

| コマンド | 説明 |
|---------|------|
| `make deploy` | コンテナ起動（down → up -d） |
| `make stop` | コンテナ停止 |
| `make logs` | ログをフォロー表示 |
| `make status` | コンテナ状態確認 |
| `make restart` | ゲートウェイ再起動 |
| `make doctor` | OpenClaw の診断実行 |
| `make chat` | TUI でインタラクティブチャット |
| `make ask MSG="..."` | ワンショットで質問 |
| `make channels` | チャネル接続状態確認（step2） |
| `make setup-slack BOT_TOKEN=... APP_TOKEN=...` | Slack セットアップ（step2） |

## セキュリティに関する注意

- `.env` には API キー・トークンが含まれます。**絶対に Git にコミットしないでください**
- `.gitignore` で `.env` は除外済みです
- OpenClaw はコンテナ内に閉じ込められていますが、完璧なセキュリティ境界ではありません

## 参考リンク

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Docker ドキュメント](https://docs.openclaw.ai/install/docker)
- [Anthropic API キー発行](https://console.anthropic.com/)
- [OpenClaw Slack 連携ドキュメント](https://docs.openclaw.ai/channels/slack)
