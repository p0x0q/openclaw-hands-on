# OpenClaw Hands-on

OpenClaw を Docker 環境で安全に動かし、各種サービスと連携するまでのハンズオン資材です。

## ステップ構成

| ステップ | ディレクトリ | 内容 |
|---------|-------------|------|
| Step 1 | `step1-docker-setup/` | Docker + Anthropic API キーで OpenClaw を起動 |
| Step 2 | `step2-slack-integration/` | Slack App を作成し、OpenClaw と連携 |
| Step 3 | `step3-gemini/` | Slack 連携 + Gemini API で OpenClaw を起動 |
| Step 4 | `step4-browser/` | Slack 連携 + Gemini + ブラウザ（Chromium）対応 |

各ステップは独立して動作します。step1 → step2 は Anthropic 系、step3 → step4 は Gemini 系の順に進めてください。Step 3・4 は Step 2 の Slack 連携を含みます。

## 前提条件

| 要件 | 詳細 |
|------|------|
| Docker Desktop or Docker Engine | 最新安定版 |
| Docker Compose | v2 以上（`docker compose` コマンド形式） |
| メモリ | 2GB 以上 |
| ディスク | 5GB 以上の空き |
| Anthropic API キー | [Anthropic Console](https://console.anthropic.com/) で発行（Step 1-2） |
| Gemini API キー | [Google AI Studio](https://aistudio.google.com/apikey) で発行（Step 3-4） |

Node.js のホスト側インストールは不要です。

## クイックスタート（Step 1）

```bash
cd step1-docker-setup

# .env を作成し、API キーを設定
cp .env.example .env
vi .env  # ANTHROPIC_API_KEY を設定

# 起動
make start

# 動作確認（別ターミナルで）
make status
make doctor
```

フォアグラウンドで起動するため、動作確認は別ターミナルで行います。ブラウザで http://localhost:18789/ にアクセスするか、ターミナルからチャットできます。

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
make start

# Slack 接続状況を確認（別ターミナルで）
make channels
```

Slack App の作成手順は `step2-slack-integration/configs/channelManifest/app-manifest.json` を Slack App 設定画面の「App Manifest」に貼り付けて使います。

## クイックスタート（Step 3）

Slack 連携 + Gemini API で OpenClaw を起動します。Step 2 の Slack 連携機能を含みます。

```bash
cd step3-gemini

# .env を作成し、Gemini API キー + Slack トークンを設定
cp .env.example .env
vi .env  # GEMINI_API_KEY, SLACK_BOT_TOKEN, SLACK_APP_TOKEN を設定

# 起動
make start

# Slack 接続状況を確認（別ターミナルで）
make channels
```

Slack App の作成手順は `step3-gemini/configs/channelManifest/app-manifest.json` を Slack App 設定画面の「App Manifest」に貼り付けて使います。

## クイックスタート（Step 4）

Step 3 にブラウザ（Chromium）サポートを追加した構成です。初回起動時に Chromium を自動ダウンロードします。

```bash
cd step4-browser

# .env を作成し、Gemini API キー + Slack トークンを設定
cp .env.example .env
vi .env  # GEMINI_API_KEY, SLACK_BOT_TOKEN, SLACK_APP_TOKEN を設定

# 起動（初回は Chromium ダウンロードのため時間がかかります）
make start

# 動作確認（別ターミナルで）
make status
make doctor
make channels
```

ブラウザ対応により、エージェントが Web ページの閲覧・操作を行えるようになります。リソース要件が上がるため、メモリ 4GB 以上を推奨します。

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
├── step2-slack-integration/
│   ├── docker-compose.yml          # Slack 環境変数を追加した構成
│   ├── configs/
│   │   ├── openclaw.json           # Slack チャネル + バインディング設定
│   │   ├── agents/
│   │   └── channelManifest/
│   │       └── app-manifest.json   # Slack App Manifest（コピペ用）
│   ├── .env.example
│   └── Makefile
├── step3-gemini/
│   ├── docker-compose.yml          # Slack + Gemini API 構成
│   ├── configs/
│   │   ├── openclaw.json           # Gemini モデル + Slack 設定
│   │   ├── agents/
│   │   └── channelManifest/
│   │       └── app-manifest.json   # Slack App Manifest（コピペ用）
│   ├── .env.example
│   └── Makefile
└── step4-browser/
    ├── docker-compose.yml          # Slack + Gemini + Chromium ブラウザ対応構成
    ├── configs/
    │   ├── openclaw.json           # Gemini + ブラウザ + Slack 設定
    │   ├── agents/
    │   └── channelManifest/
    │       └── app-manifest.json   # Slack App Manifest（コピペ用）
    ├── scripts/
    │   └── entrypoint.sh           # Chromium 依存関係インストール + 起動
    ├── .env.example
    └── Makefile
```

## 各ステップの差分

### step1 → step2（Slack 連携追加）

| ファイル | 変更内容 |
|---------|---------|
| `docker-compose.yml` | `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` の環境変数、init コンテナに `envsubst` 追加 |
| `configs/openclaw.json` | `channels.slack` と `bindings` セクションを追加 |
| `configs/channelManifest/` | Slack App Manifest（新規） |
| `Makefile` | `channels` ターゲット追加 |
| `.env.example` | Slack トークン 2 種を追加 |

### step2 → step3（Gemini 対応）

step2 の Slack 連携をベースに、LLM を Gemini に切り替えた構成です。

| ファイル | 変更内容 |
|---------|---------|
| `docker-compose.yml` | 環境変数を `ANTHROPIC_API_KEY` → `GEMINI_API_KEY` に変更 |
| `configs/openclaw.json` | モデルを `anthropic/claude-sonnet-4-5` → `google/gemini-3-flash-preview` に変更 |
| `.env.example` | `ANTHROPIC_API_KEY` → `GEMINI_API_KEY` に変更 |

### step3 → step4（ブラウザ追加）

step3 に Chromium ブラウザサポートを追加した構成です。

| ファイル | 変更内容 |
|---------|---------|
| `docker-compose.yml` | `openclaw-browser-init` サービス追加、`entrypoint.sh` マウント、リソース上限増加（4GB / 2CPU） |
| `configs/openclaw.json` | `browser` セクション追加（Chromium ヘッドレス） |
| `scripts/entrypoint.sh` | Chromium 依存関係インストール + 権限降格起動（新規） |

## Makefile コマンド一覧

| コマンド | 説明 |
|---------|------|
| `make start` | コンテナ起動（フォアグラウンド） |
| `make stop` | コンテナ停止 |
| `make logs` | ログをフォロー表示 |
| `make status` | コンテナ状態確認 |
| `make restart` | ゲートウェイ再起動 |
| `make doctor` | OpenClaw の診断実行 |
| `make chat` | TUI でインタラクティブチャット |
| `make ask MSG="..."` | ワンショットで質問 |
| `make channels` | チャネル接続状態確認（step2-4） |

## セキュリティに関する注意

- `.env` には API キー・トークンが含まれます。**絶対に Git にコミットしないでください**
- `.gitignore` で `.env` は除外済みです
- OpenClaw はコンテナ内に閉じ込められていますが、完璧なセキュリティ境界ではありません

## 参考リンク

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Docker ドキュメント](https://docs.openclaw.ai/install/docker)
- [Anthropic API キー発行](https://console.anthropic.com/)
- [OpenClaw Slack 連携ドキュメント](https://docs.openclaw.ai/channels/slack)
