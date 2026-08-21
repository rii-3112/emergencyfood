# SonaBase

家族の防災情報をひとつの場所にまとめる Web アプリです。  
備蓄品の管理を軸に、期限・在庫の通知や、非常時に確認したい情報（チェックリスト・ハザードマップ・災害用伝言板）をチーム（家族グループ）単位で扱えます。

個人開発リポジトリです。2025 技育博 Vol.3 に個人参加しました。

## 主な機能

- **備蓄品管理** — 登録・一覧・消費・補充・アーカイブ・履歴
- **在庫・期限アラート** — LINE 連携で在庫切れ・期限接近を通知（週次 cron）
- **チーム（家族グループ）** — 作成・招待・参加、管理者権限
- **防災ハンドブック** — 備蓄チェックリスト、ハザードマップ、災害用伝言板
- **アカウント設定** — プロフィール、パスワード、LINE 連携

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| フロント / API | Next.js 15（App Router）、React 19、TypeScript |
| スタイル | Tailwind CSS 4 |
| 認証 | Better Auth（メール / Google） |
| Auth DB | Turso（libSQL）無料枠 ※ローカルは `file:./data/auth.db` 可 |
| アプリ DB | Cloud Firestore |
| 通知 | LINE Messaging API |
| デプロイ | Vercel |
| 定期実行 | GitHub Actions（`/api/cron/check-expiry`） |

## セットアップ

### 前提

- Node.js 18 以上
- Firebase プロジェクト（Firestore 用）
- Auth 用 DB: ローカルファイル、または [Turso](https://turso.tech/) 無料 DB
- （任意）Google OAuth クライアント（Google ログイン用）
- （任意）LINE Messaging API チャネル

### 手順

```bash
git clone <repository-url>
cd emergencyfood
npm install
npm run db:push
```

ルートに `.env.local` を用意します。

```env
# Better Auth
BETTER_AUTH_SECRET=  # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Auth DB（未設定時は file:./data/auth.db）
# TURSO_DATABASE_URL=libsql://xxxx.turso.io
# TURSO_AUTH_TOKEN=

# Google OAuth（任意）
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# Redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google

# Firebase（Firestore）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# App / LINE / cron
NEXT_PUBLIC_APP_URL=http://localhost:3000
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
CRON_JOB_SECRET=
```

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

### 既存 Firebase Auth ユーザーについて

認証は Better Auth に移行済みです。旧 Firebase Auth のログインは使えません。新規登録してください。  
Firestore 上の旧 uid データは、必要に応じて新 uid へ手動で付け替えてください。

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー（Turbopack） |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run db:push` | Auth 用 DB スキーマを反映 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier で整形 |
| `npm run type-check` | TypeScript 型チェック |
| `npm run check-all` | 型・Lint・フォーマットをまとめて確認 |

## 定期実行（LINE アラート）

`.github/workflows/cron-check-expiry.yml` が毎週月曜 7:00 UTC（日本時間 16:00）に実行され、本番の
`POST /api/cron/check-expiry` を呼び出します。手動実行（`workflow_dispatch`）も可能です。

通知対象:

- チームの通知設定が有効
- 在庫切れ、またはカテゴリごとの通知日数内で期限が近い備蓄品

## ディレクトリ構成（抜粋）

```text
app/                 # ページ・API Routes
lib/                 # Better Auth / DB
components/          # UI コンポーネント
hooks/               # カスタムフック
utils/               # Firestore・在庫計算・認証ヘルパーなど
types/               # 型定義
.github/workflows/   # cron など
```

## ライセンス

[MIT](./LICENSE)
