# SonaBase 要件定義書

> 本ドキュメントは `/Users/rii/Documents/develop/emergencyfood` の現行コードベースから逆引きした要件定義である。  
> 実装済みの挙動・データ構造・制約を正とし、将来の改修や受入テストのたたき台とする。

| 項目 | 内容 |
| --- | --- |
| プロダクト名 | SonaBase（リポジトリ名: emergencyfood） |
| 種別 | 家族向け防災 Web アプリ |
| 本番 URL | https://www.sonabase.app |
| 最終更新 | 2026-08-23（コードベース調査時点） |

---

## 1. 背景・目的

### 1.1 背景

家族（世帯）単位で防災備蓄を管理する際、在庫・期限・非常時の確認事項が分散しやすい。複数メンバーで共有・更新する仕組みが必要。

### 1.2 目的

備蓄品管理を中核に、以下を **チーム（家族グループ）単位** で一箇所に集約する。

- 備蓄品の登録・消費・補充・履歴管理
- 在庫不足・期限接近の把握と LINE 通知
- 防災ハンドブック（チェックリスト・ハザードマップ・災害用伝言板）

### 1.3 想定ユーザー

本アプリの **ユーザーは Web アプリに登録・ログインした人のみ** である。  
LINE 公式アカウントを友だち追加しただけでは SonaBase のユーザーにはならない。

| ユーザー種別 | 説明 | 主なニーズ |
| --- | --- | --- |
| 世帯の管理者 | チーム作成者（owner）または admin | 家族構成に合わせた備蓄目標、メンバー招待、通知設定 |
| 家族メンバー | チームに参加した登録ユーザー | 備蓄の登録・消費・補充、ハンドブックの参照・更新 |
| （任意）LINE 連携済みユーザー | 上記ユーザーが LINE を紐づけた状態 | 在庫切れ・期限接近のプッシュ通知を LINE で受信 |

**LINE の位置づけ**: 別ログイン手段ではなく、**既存ユーザー向けの通知チャネル** である。  
Web でアカウントを持ち、設定画面から連携したメンバーにのみ cron 通知が届く。

---

## 2. スコープ

### 2.1 対象（In Scope）

- Web ブラウザ向け UI（Next.js App Router）
- メール / Google によるアカウント登録・ログイン
- チーム作成・参加・切替・管理者管理
- 備蓄品 CRUD、FIFO 消費、履歴、レビュー
- 在庫達成率・不足カテゴリの可視化
- 防災ハンドブック 3 機能
- **登録ユーザー** による LINE アカウント連携（任意）と週次 cron 通知
- Vercel デプロイ、GitHub Actions による定期実行

### 2.2 対象外（Out of Scope / 現状未実装）

- ネイティブアプリ
- 決済・課金
- **LINE のみでのアカウント登録・ログイン**（LINE 友だち追加だけではユーザーにならない）
- Firebase Auth（Better Auth へ移行済み。旧ユーザーは再登録）
- ハザードマップ情報の Firestore 永続化（UI + 外部リンクのみ）
- React Native（Expo）ネイティブアプリ（将来対応。API ファーストで Web を先行）

---

## 3. 用語定義

| 用語 | 定義 |
| --- | --- |
| SonaBase ユーザー | メール or Google で Web アプリに登録し、Better Auth セッションを持つ人。Firestore `users/{uid}` が存在する |
| チーム | 家族グループ。備蓄・ハンドブック・設定を共有する単位 |
| アクティブチーム | ユーザーが現在操作対象とするチーム（`teamId` / `activeTeamId`） |
| LINE 公式アカウント | 連携コード配信・在庫アラート送信用の Bot。**アプリのログイン主体ではない** |
| LINE 連携 | SonaBase ユーザーが自分の LINE ID（`lineUserId`）をアカウントに紐づけること。設定 > LINE タブから行う |
| 備蓄品 | `supplies` コレクションの在庫アイテム |
| 履歴 | `supply_history` にアーカイブされた過去の備蓄統計 |
| 備蓄日数 | 目標とする備蓄期間（3 / 7 / 14 / 30 日） |
| ロット | `expiryDates[]` 内の「期限 + 数量」の単位 |

---

## 4. 機能要件

### 4.1 認証・アカウント

#### FR-AUTH-01 ユーザー登録

- メールアドレス + パスワード（6 文字以上）で登録できる
- Google OAuth で登録できる（環境変数設定時）
- 登録後、プロフィール画面で **表示名** と **性別** の入力が必須
  - 性別: `male` / `female` / `prefer_not_to_say`
- Better Auth（Turso）にユーザー作成後、Firestore `users/{uid}` を自動作成する

#### FR-AUTH-02 ログイン・ログアウト

- メール / Google でログインできる
- セッション有効期限: 7 日（24 時間ごとに更新）
- ログアウトでセッションを破棄できる

#### FR-AUTH-03 プロフィール管理

- 表示名・性別の変更（設定 > アカウント）
- パスワード変更（6 文字以上）

#### FR-AUTH-04 アクセス制御

- 未ログイン: `/`, `/auth/*`, 招待情報 API のみ
- ログイン済み・チーム未所属: 設定（チームタブ）へ誘導
- ログイン済み・チーム所属: ホーム・備蓄・ハンドブック・設定を利用可能

---

### 4.2 オンボーディング

#### FR-ONB-01 初回登録後フロー

1. 認証完了
2. `/auth/register/profile` で名前・性別入力
3. Firestore ユーザー確保（`ensure-user`）
4. **招待コードあり**: 自動でチーム参加 → `/home`
5. **招待コードなし**: デフォルトチーム「{表示名}の家族」を作成 → `/home`
6. チーム作成失敗時: `/settings?tab=team` へフォールバック

#### FR-ONB-02 ログイン後フロー

- `teamId` あり → `/home`
- `teamId` なし → `/settings?tab=team`

---

### 4.3 チーム（家族グループ）

#### FR-TEAM-01 チーム作成

- チーム名（2〜50 文字、重複不可）と任意パスワードで作成
- パスワード省略時は `auto-{uid}-{timestamp}` を自動生成
- パスワードは Turso `team.password_hash` に scrypt ハッシュで保存（Firestore には保存しない）
- 作成者は `owner` かつ `admins` / `members` に含まれる

#### FR-TEAM-02 チーム参加

| 方式 | 入力 | 備考 |
| --- | --- | --- |
| 名前 + パスワード | チーム名、パスワード | 既参加時はアクティブ切替のみ |
| 招待コード | 7 日有効のコード | 登録時 or `/teams/invite` |

#### FR-TEAM-03 複数チーム

- 1 ユーザーが複数チームに所属可能（`users.teams[]`）
- ヘッダー等からアクティブチームを切替可能

#### FR-TEAM-04 ロールと権限

| 操作 | owner | admin | member |
| --- | --- | --- | --- |
| チーム名変更 | ○ | ○ | × |
| 備蓄・通知設定変更 | ○ | ○ | × |
| 管理者追加/削除 | ○ | ○ | × |
| owner 削除 | × | × | × |
| 備蓄品登録・消費・補充 | ○ | ○ | ○ |
| 備蓄品更新 | 登録者のみ | 登録者のみ | 登録者のみ |
| 備蓄品削除 | ○（同一チーム） | ○ | ○ |

#### FR-TEAM-05 備蓄設定（TeamStockSettings）

| 項目 | 制約・デフォルト |
| --- | --- |
| `householdSize` | 1〜50 |
| `stockDays` | **3 / 7 / 14 / 30** のみ（初期 3） |
| `stockLevel` | `beginner` / `standard` / `advanced` |
| `composition` | adult / child / infant / elderly の人数 |
| `hasPets`, `dogCount`, `catCount` | ペット備蓄計算用 |
| `needsSanitarySupplies` | 生理用品推奨の明示設定 |
| `notifications.enabled` | LINE 通知の ON/OFF |
| `notifications.criticalStock` | 在庫切れ通知（デフォルト ON） |
| `notifications.expiryNear` | 期限接近通知（デフォルト ON） |

---

### 4.4 備蓄品管理

#### FR-SUP-01 登録

必須: 名前、数量、期限、カテゴリ、単位  
任意: 容量、購入場所、ラベル、保管場所

- カテゴリ: 28 種（米・パン〜ペットフード〜その他）
- 単位: 個 / 袋 / kg / L 等
- 名前最大 100 文字、数量最大 9999

#### FR-SUP-02 一覧・表示

- アクティブ備蓄一覧（`/supplies/list`）
- アーカイブ済みの非表示管理
- 在庫ステータス表示（`out` / `critical` / `low` / `below-recommended` / `sufficient`）
- 不足カテゴリアラート（`MissingCategoriesAlert`）

#### FR-SUP-03 消費（FIFO）

- `expiryDates[]` がある場合、**期限が近いロットから**減算
- ロット未設定時は `expiryDate` + 全数量で初期化して消費
- 数量 0 で `zeroStockSince` を記録、補充でクリア

#### FR-SUP-04 補充

- 同一期限ロットへ数量加算、または新ロット追加

#### FR-SUP-05 アーカイブ・履歴

| 操作 | 結果 |
| --- | --- |
| 非表示（archive-supply） | `isArchived: true`、一覧から除外 |
| リスト復元（restore-supply） | `isArchived: false` |
| 履歴化（archive-to-history） | `supply_history` に統計集約 |
| 履歴から復元 | 新規 supplies として再登録 |
| 完全削除 | supplies + 関連データ削除 |

履歴マージ: 同一 `teamId` + `name` + `category` があれば `totalConsumed`, `reviewCount`, `purchaseLocations` を統合

#### FR-SUP-06 レビュー

- チーム内で備蓄品ごとに感想を投稿・閲覧
- 投稿者本人のみ削除可能

---

### 4.5 在庫・期限計算

#### FR-STOCK-01 推奨量計算

```
推奨量 = ceil(1日消費量 × stockDays)
```

または世帯固定目標（`householdUnitTarget`）を使用。

- 1 日消費量: 年齢別構成 × カテゴリ別消費係数、または `perPersonPerDay × householdSize`
- ペット: `perDogPerDay × dogCount`, `perCatPerDay × catCount`

#### FR-STOCK-02 在庫ステータス

| ステータス | 条件（概要） |
| --- | --- |
| `out` | 在庫 0 |
| `critical` | 残日数 1 日未満相当 |
| `low` | 残 3 日未満相当 |
| `below-recommended` | 推奨量未満 |
| `sufficient` | 推奨量以上 |

#### FR-STOCK-03 カテゴリ別推奨フィルタ

| カテゴリ | 表示条件 |
| --- | --- |
| おむつ・ベビー用品 | `composition.infant > 0` |
| ペットフード | `hasPets === true` |
| 生理用品 | `needsSanitarySupplies === true`、または未設定かつ閲覧者 gender ≠ `male` |

#### FR-STOCK-04 期限警告（UI）

| 定数 | 日数 |
| --- | --- |
| `NEAR_EXPIRY` | 30 日 |
| `CRITICAL_EXPIRY` | 7 日 |

#### FR-STOCK-05 期限通知（cron / LINE）

カテゴリ種別ごとの通知開始日:

| 種別 | ラベル | 通知開始（日前） |
| --- | --- | --- |
| food | 賞味期限 | 30 |
| medical | 消費期限 | 60 |
| daily / other | 使用期限 | 90 |
| noExpiry（「その他」等） | — | 通知なし |

cron の在庫切れ判定: `status === "out"` のみ（critical / low は LINE 対象外）

---

### 4.6 LINE 通知（通知チャネル）

LINE は **独立したユーザー種別ではない**。  
SonaBase に登録済みのユーザーが、任意で LINE を連携したうえで通知を受け取る仕組みである。

#### 前提（ユーザーにならないケース）

| 操作 | SonaBase ユーザーになるか |
| --- | --- |
| Web でメール / Google 登録 | **なる** |
| LINE 公式アカウントを友だち追加のみ | **ならない**（連携コードが届くだけ） |
| 友だち追加 + Web 登録 + 設定でコード入力 | **連携済みユーザー**（通知受信可能） |

#### FR-LINE-01 アカウント連携（登録ユーザーのみ）

1. **先に** Web アプリで登録・ログイン（SonaBase ユーザーになる）
2. LINE 公式アカウントを友だち追加
3. Webhook `follow` イベントで 6 桁コードを DM（5 分有効）
4. ログイン状態のアプリ **設定 > LINE** でコード入力 → `link-line-account`
5. Firestore `users.lineUserId` と Better Auth の `lineUserId` を同期

解除: `unlink-line-account`（SonaBase アカウントは残る）  
再送: LINE で「コード再送」メッセージ

#### FR-LINE-02 週次アラート（cron）

- トリガー: GitHub Actions 毎週月曜 7:00 UTC（JST 16:00）、手動実行可
- エンドポイント: `POST /api/cron/check-expiry`（`x-cron-secret` 必須）
- 送信条件:
  - チームの `notifications.enabled === true`
  - サブ条件: `criticalStock` / `expiryNear`（各デフォルト ON）
  - 送信先: チーム `members` のうち **`lineUserId` が紐づいている SonaBase ユーザー**
  - **同一チーム 24 時間クールダウン**（`lastWeeklyReportAt`）
- メッセージ内容: 在庫切れ全件 + 期限接近上位 3 件（残日数昇順）

※ LINE 未連携のメンバーには通知は届かない（Web 上での確認のみ）。

#### FR-LINE-03 Webhook セキュリティ

- `x-line-signature` による HMAC-SHA256 署名検証

---

### 4.7 防災ハンドブック（`/handbook`）

3 つのチェックポイントを提供する。

#### FR-HBK-01 備蓄チェックリスト

- 年齢別（世帯共通 / 大人 / 子供 / 乳幼児 / 高齢者）・ペット別アイテム
- チェック状態を Firestore `handbook-checklists/{teamId}` に保存
- 旧形式（`ageGroups` / `pets`）との読み取り互換あり

#### FR-HBK-02 ハザードマップ

- 都道府県選択 + 市町村 Google 検索
- 国交省ポータル、気象庁、内閣府防災等への外部リンク
- **Firestore 永続化なし**（UI のみ）

#### FR-HBK-03 災害用伝言板

Firestore `disaster-boards/{teamId}` に保存:

- 避難場所（災害種別、名称、住所、メモ）
- 避難経路（名称、説明、目印、メモ）
- 安否確認方法（手段、連絡先、優先度、メモ）
- 家族の約束（タイトル、説明、カテゴリ）
- 災害用ダイヤル利用フラグ（デフォルト `true`）

---

### 4.8 設定画面（`/settings`）

| タブ | 機能 |
| --- | --- |
| `line` | LINE 連携 / 解除 |
| `account` | 表示名、性別、パスワード変更 |
| `team` | チーム CRUD、招待、備蓄設定、通知、管理者 |
| `logout` | ログアウト |

---

## 5. 画面一覧

| パス | 認証 | teamId | 概要 |
| --- | --- | --- | --- |
| `/` | 不要 | — | ランディング（ログイン / 登録導線） |
| `/auth/login` | 不要 | — | ログイン |
| `/auth/register` | 不要 | — | 新規登録 |
| `/auth/register/profile` | 要 | — | プロフィール完成 |
| `/home` | 要 | 要 | 機能ハブ |
| `/supplies/list` | 要 | 要 | 備蓄一覧 |
| `/supplies/add` | 要 | 要 | 備蓄登録 |
| `/supplies/history` | 要 | 要 | 履歴一覧 |
| `/supplies/[id]/reviews` | 要 | 要 | レビュー |
| `/handbook` | 要 | 要 | 防災ハンドブック |
| `/settings` | 要 | 任意 | 各種設定 |
| `/teams/invite` | — | — | 招待参加 UI |

---

## 6. データ要件

### 6.1 Auth DB（Turso / SQLite — Better Auth）

| テーブル | 用途 |
| --- | --- |
| `user` | 認証ユーザー（`team_id`, `line_user_id`, `gender` 拡張） |
| `session` | セッション |
| `account` | OAuth / パスワード（`issuer` + `account_id` で外部 ID） |
| `verification` | OAuth state / メール検証 |
| `team` | チーム ID・名前・password_hash（scrypt）・owner |
| `team_member` | team_id, user_id, role（owner / admin / member） |
| `invite` | 招待コード・team_id・expires_at・used |
| `supply` | 備蓄品（expiry_dates JSON、FIFO 消費） |
| `supply_history` | アーカイブ履歴 |
| `supply_review` | 備蓄レビュー |

### 6.2 Firestore コレクション

| コレクション | docId | 主なフィールド |
| --- | --- | --- |
| `users` | uid | email, displayName, gender, teamId, teams[], activeTeamId, lineUserId（**gender / 所属は Turso を SoT に段階移行中**） |
| `teams` | auto | name, members[], admins[], ownerId, stockSettings, lastWeeklyReportAt（**password は Turso**） |
| `supplies` | auto | ~~移行中~~ → Turso `supply` が SoT |
| `supplyReviews` | auto | ~~移行中~~ → Turso `supply_review` が SoT |
| `supply_history` | auto | ~~移行中~~ → Turso `supply_history` が SoT |
| `handbook-checklists` | teamId | checkedItemIds[], checkedPetItems{} |
| `disaster-boards` | teamId | evacuationSites[], routes[], safetyMethods[], familyAgreements[] |
| `invites` | inviteCode | ~~移行中~~ → Turso `invite` が SoT |
| `lineAuthCodes` | lineUserId | code (6桁), expireAt (+5分) |

### 6.3 データ同期ルール

- `teamId` / `lineUserId` は **Better Auth（Turso）と Firestore の両方** に同期
- ユーザー作成時: Better Auth hook → Firestore `users` 自動作成
- チーム切替時: `users.teamId` / `activeTeamId` と Better Auth `user.teamId` を更新

---

## 7. API 要件（概要）

### 7.1 認証

| メソッド | パス | 用途 |
| --- | --- | --- |
| * | `/api/auth/[...all]` | Better Auth ハンドラ |

### 7.2 ユーザー

| POST | `/api/actions/ensure-user` | Firestore user 確保 |
| POST | `/api/actions/update-user-name` | 表示名・gender 更新 |
| POST | `/api/actions/change-password` | パスワード変更 |
| POST | `/api/actions/link-line-account` | LINE 連携 |
| POST | `/api/actions/unlink-line-account` | LINE 解除 |

### 7.3 チーム

| POST | `/api/actions/createTeam` | 作成 |
| POST | `/api/actions/joinTeam` | 名前+PW 参加 |
| POST | `/api/team/join-by-invite` | 招待参加 |
| POST | `/api/team/generate-invite` | 招待コード生成 |
| GET | `/api/team/invite-info` | 招待情報（認証不要） |
| GET | `/api/team/my-teams` | 所属一覧 |
| GET | `/api/team/[teamId]` | 詳細 + メンバー |
| POST | `/api/team/switch` | アクティブ切替 |
| POST | `/api/team/update-stock-settings` | 備蓄・通知設定 |
| POST | `/api/actions/update-team-name` | 名称変更 |
| POST | `/api/actions/add-admin` / `remove-admin` | 管理者管理 |
| POST | `/api/actions/migrate-team-data` | 旧形式移行 |

### 7.4 備蓄品

| POST | `/api/supplies` | 新規登録 |
| GET | `/api/supplies/list` | 一覧 |
| POST | `/api/actions/consume-supply` | 消費 |
| POST | `/api/actions/restock-supply` | 補充 |
| POST | `/api/actions/update-supply` | 更新 |
| POST | `/api/actions/archive-supply` | 非表示 |
| POST | `/api/actions/restore-supply` | リスト復元 |
| POST | `/api/actions/archive-to-history` | 履歴化 |
| POST | `/api/actions/restore-from-history` | 履歴から復元 |
| POST | `/api/actions/delete-supply` | 完全削除 |
| GET/POST/DELETE | `/api/supplies/[id]/reviews` | レビュー |
| GET | `/api/supply-history` | 履歴一覧 |

### 7.5 ハンドブック / 外部

| GET/POST | `/api/handbook/checklist` | チェックリスト |
| GET/POST | `/api/disaster-board` | 災害用伝言板 |
| POST | `/api/line/webhook` | LINE Webhook |
| POST | `/api/cron/check-expiry` | 週次アラート |

### 7.6 共通 API 要件

- 保護 API: Better Auth セッション Cookie（`requireApiUser`）
- Cron: `x-cron-secret === CRON_JOB_SECRET`
- エラー: JSON `{ error: string }` + 適切な HTTP ステータス

---

## 8. 非機能要件

### 8.1 技術スタック

| 領域 | 技術 |
| --- | --- |
| フロント / API | Next.js 15（App Router）、React 19、TypeScript |
| スタイル | Tailwind CSS 4 |
| 認証 | Better Auth |
| Auth DB | Turso（libSQL）/ ローカル SQLite — Auth テーブル + `team` / `team_member` |
| アプリ DB | Cloud Firestore（段階的に Turso へ移行中） |
| テスト | Vitest（`lib/` バックエンドのユニット・統合テスト） |
| 通知 | LINE Messaging API |
| デプロイ | Vercel |
| 定期実行 | GitHub Actions |

### 8.2 セキュリティ

- API 認証: Better Auth セッション
- `trustedOrigins`: localhost, sonabase.app, Vercel URL
- LINE Webhook 署名検証
- Cron シークレットヘッダ
- 備蓄更新: 登録者 + 同一 team 制限
- チームパスワード: Turso `team.password_hash`（scrypt）。Firestore / 招待 doc に平文保存しない
- middleware.ts **なし** — ページ / API 単位で認可

### 8.2.1 バックエンド構成・ネイティブ方針

- **3 層**: `app/api`（薄い HTTP）→ `lib/services`（ビジネスロジック）→ `lib/repositories`（Drizzle / Turso）
- **API ファースト**: クライアント（Web / 将来 React Native）は DB に直接アクセスしない
- **テスト**: `lib/` 配下のバックエンド追加時は Vitest で `*.test.ts` を同時に追加
- **将来ネイティブ**: Expo（React Native）を想定。Web と API・型・純関数を共有

### 8.3 可用性・運用

- 主要保護ページ: `dynamic = "force-dynamic"`
- Auth スキーマ反映: `npm run db:push`（`.env.local` の Turso 設定を読む）
- クライアントエラー: `ErrorBoundary`（ClientLayout）

### 8.4 環境変数（必須一覧）

```env
# Auth
BETTER_AUTH_URL
BETTER_AUTH_SECRET
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN

# Firebase（Firestore）
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
NEXT_PUBLIC_FIREBASE_*  # クライアント SDK 用

# App
NEXT_PUBLIC_APP_URL

# Cron
CRON_JOB_SECRET

# 任意
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET
```

---

## 9. 受入条件（代表例）

| ID | 条件 |
| --- | --- |
| AC-01 | メール登録 → プロフィール入力 → デフォルトチーム作成 → `/home` 到達 |
| AC-02 | Google 登録 → OAuth コールバック → プロフィール入力 → チーム参加 |
| AC-03 | 招待コード付き登録 → 指定チームに自動参加 |
| AC-04 | 備蓄登録 → FIFO 消費 → 数量 0 で `zeroStockSince` 記録 |
| AC-05 | 補充 → `zeroStockSince` クリア |
| AC-06 | 在庫 0 の備蓄 → cron 実行 → LINE 通知（設定 ON・クールダウン外） |
| AC-07 | 期限 30 日以内の食品 → cron / UI で警告 |
| AC-08 | owner 以外が owner を管理者削除しようとして失敗 |
| AC-09 | 未ログインで `/supplies/list` アクセス → ログインへリダイレクト |
| AC-10 | **登録済みユーザー**が LINE 友だち追加 → 6 桁コード → 設定画面で連携完了 → `lineUserId` 保存 |

---

## 10. コードから読み取れる既知の制約・ギャップ

要件として **現状の実装事実** として記載する。改修候補ではあるが、本ドキュメント時点では「仕様」として扱う。

| # | 内容 |
| --- | --- |
| GAP-01 | ~~チーム `password` は平文で Firestore に保存~~ → **解消**: Turso `team.password_hash`（scrypt） |
| GAP-02 | ~~招待 `used` フラグは join 時に更新されない~~ → **解消**: Turso `invite.used` を join 時に更新 |
| GAP-03 | ~~`delete-supply` のレビュー削除参照が誤コレクション~~ → **解消**: Turso `supply_review` を cascade 削除 |
| GAP-04 | ハザードマップは永続化なし |
| GAP-05 | Firebase Auth ユーザーは再登録が必要（旧 uid データは手動移行） |
| GAP-06 | Google OAuth リダイレクト URI: `{BETTER_AUTH_URL}/api/auth/callback/google` |

---

## 11. 改訂履歴

| 日付 | 内容 |
| --- | --- |
| 2026-08-23 | 初版（コードベース逆引き） |
| 2026-08-23 | Phase 2–4: invite / user.gender / supplies・history・reviews を Turso へ移行、Vitest 拡充 |
