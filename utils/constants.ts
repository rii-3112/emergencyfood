export const ERROR_MESSAGES = {
  INVALID_EMAIL: "無効なメールアドレス形式です。",
  USER_DISABLED: "このアカウントは無効化されています。",
  INVALID_CREDENTIALS: "メールアドレスまたはパスワードが間違っています。",
  TOO_MANY_REQUESTS:
    "何度もログインに失敗しました。しばらく待ってから再度お試しください。",
  LOGIN_FAILED: "ログインに失敗しました。時間をおいて再度お試しください。",
  EMAIL_ALREADY_IN_USE: "このメールアドレスはすでに使われています。",
  WEAK_PASSWORD: "パスワードは6文字以上にしてください。",
  REGISTRATION_FAILED: "登録に失敗しました。",
  PASSWORD_CHANGE_FAILED: "パスワードの変更に失敗しました。",
  NAME_UPDATE_FAILED: "名前の更新に失敗しました。",

  FAMILY_GROUP_NAME_EXISTS: "家族グループ名は既に存在します。",
  FAMILY_GROUP_NOT_FOUND: "家族グループが見つかりません。",
  INCORRECT_FAMILY_GROUP_CREDENTIALS:
    "家族グループ名またはパスワードが間違っています。",
  ALREADY_IN_FAMILY_GROUP:
    "既に他の家族グループに所属しています。先に脱退してください。",
  FAMILY_GROUP_ID_MISSING:
    "家族グループIDが設定されていません。家族グループに参加または作成してください。",
  ADMIN_UPDATE_FAILED: "管理者の更新に失敗しました。",
  FAMILY_GROUP_FETCH_FAILED: "家族グループ情報の取得に失敗しました。",

  FOOD_FETCH_FAILED: "データの取得に失敗しました。",
  FOOD_ARCHIVE_FAILED: "備蓄品の非表示に失敗しました。",
  FOOD_UPDATE_FAILED: "備蓄品の更新に失敗しました。",
  FOOD_CREATE_FAILED: "備蓄品の登録に失敗しました。",
  FOOD_DELETE_FAILED: "備蓄品の削除に失敗しました。",
  NO_FOODS_REGISTERED: "登録された備蓄品はありません。",

  UNAUTHORIZED: "認証が必要です。",
  NETWORK_ERROR: "ネットワークエラーが発生しました。",
  UNKNOWN_ERROR: "不明なエラーが発生しました。",
  LOADING: "ロード中...",
  OPERATION_SUCCESS: "操作が完了しました",
} as const;

export const SUCCESS_MESSAGES = {
  FAMILY_GROUP_CREATED: "家族グループが作成されました。",
  FAMILY_GROUP_JOINED: "家族グループに参加しました。",
  FOOD_ARCHIVED: "備蓄品を非表示にしました。",
  FOOD_RESTORED: "備蓄品を復元しました。",
  FOOD_UPDATED: "備蓄品を更新しました。",
  FOOD_CREATED: "備蓄品を登録しました。",
  FOOD_DELETED: "備蓄品を削除しました。",
  CUSTOM_CLAIMS_SET: "カスタムクレームが設定されました。",
  LINE_ACCOUNT_LINKED: "LINEアカウントが連携されました。",
  LINE_ACCOUNT_UNLINKED: "LINEアカウントの連携が解除されました。",
  PASSWORD_CHANGED: "パスワードが変更されました。",
  NAME_UPDATED: "名前が更新されました。",
  PROFILE_UPDATED: "プロフィールを更新しました。",
  ADMIN_ADDED: "管理者を追加しました。",
  ADMIN_REMOVED: "管理者を削除しました。",
  LOGOUT_SUCCESS: "ログアウトしました。",
} as const;

export const UI_CONSTANTS = {
  LOGIN_TITLE: "ログイン",
  REGISTER_TITLE: "ユーザー登録",
  NO_ACCOUNT_MESSAGE: "まだアカウントをお持ちでない方はこちらから",
  HAS_ACCOUNT_MESSAGE: "既にアカウントをお持ちの方はこちらから",
  REGISTER_LINK: "ユーザー登録",
  LOGIN_LINK: "ログイン",

  SETTINGS_TITLE: "設定",
  ACCOUNT_SETTINGS: "アカウント設定",
  FAMILY_GROUP_SETTINGS: "家族グループ設定",
  LINE_NOTIFICATION_SETTINGS: "LINE通知設定",
  LOGOUT: "ログアウト",
  ACCOUNT_NAME: "アカウント名",
  EMAIL_ADDRESS: "メールアドレス",
  CHANGE_PASSWORD: "パスワードを変更する",
  FAMILY_GROUP_NAME: "家族グループ名",
  FAMILY_GROUP_OWNER: "オーナー",
  FAMILY_GROUP_MEMBERS: "メンバー",
  FAMILY_GROUP_ADMINS: "管理者",
  ADD_ADMIN: "管理者に追加",
  REMOVE_ADMIN: "管理者から削除",
  CONFIRM_LOGOUT: "ログアウトしますか？",
  CONFIRM_DELETE_FOOD:
    "この備蓄品を完全に削除しますか？この操作は取り消せません。",

  CONFIRM_ARCHIVE:
    "この備蓄品をリストから非表示にします。もう二度と表示されなくなりますがよろしいですか？（「過去の備蓄品」ページからは確認できます）",
  FAMILY_GROUP_SELECTION_REQUIRED:
    "備蓄品リストを閲覧するには、いずれかの家族グループに参加してください。",
  LOGIN_REQUIRED_FOR_REVIEW: "感想を投稿するにはログインが必要です。",

  CREATE_FAMILY_GROUP_TITLE: "新しい家族グループを作る",
  JOIN_FAMILY_GROUP_TITLE: "既存の家族グループに参加",
  FAMILY_GROUP_SELECTION_TITLE: "家族グループへの参加または作成",

  BACK_TO_FAMILY_GROUP_SELECTION: "家族グループ選択画面に戻る",
  ADD_NEW_FOOD: "新しい備蓄品を登録する",
  VIEW_REVIEWS: "感想を見る・書く",

  EDIT: "編集",
  ARCHIVE: "非表示",
  RESTORE: "リストに戻す",
  DELETE: "削除",
  UPDATE: "更新",
  SUBMIT: "投稿する",
  CANCEL: "キャンセル",
  CONFIRM: "確認",
  PROCESSING: "処理中...",
  SAVE: "保存",
} as const;

export const PROFILE_GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "prefer_not_to_say", label: "回答しない" },
] as const;

export const API_ENDPOINTS = {
  ARCHIVE_FOOD: "/api/actions/archive-supply",
  RESTORE_FOOD: "/api/actions/restore-supply",
  UPDATE_FOOD: "/api/actions/update-supply",
  DELETE_FOOD: "/api/actions/delete-supply",

  CREATE_TEAM: "/api/actions/createTeam",
  JOIN_TEAM: "/api/actions/joinTeam",
  ADD_ADMIN: "/api/actions/add-admin",
  REMOVE_ADMIN: "/api/actions/remove-admin",
  MIGRATE_TEAM_DATA: "/api/actions/migrate-team-data",

  LINK_LINE: "/api/actions/link-line-account",
  UNLINK_LINE: "/api/actions/unlink-line-account",
  UPDATE_USER_NAME: "/api/actions/update-user-name",
  CHANGE_PASSWORD: "/api/actions/change-password",
  SET_TEAM_CLAIM: "/api/setTeamClaim",
  SET_CUSTOM_CLAIMS: "/api/setCustomClaims",
} as const;

export const DEFAULT_TEAM_STOCK_DAYS = 3;

export const FOOD_CATEGORIES = [
  // 備蓄品・飲料
  "米・パン",
  "麺類",
  "缶詰",
  "レトルト食品",
  "インスタント食品",
  "乾物",
  "調味料",
  "飲料",
  "野菜・果物",
  "菓子",
  // 日用品
  "トイレットペーパー",
  "ティッシュペーパー",
  "ウェットティッシュ",
  "洗剤・石鹸",
  "シャンプー・ボディソープ",
  "歯磨き粉・歯ブラシ",
  "生理用品",
  "おむつ・ベビー用品",
  "マスク・消毒液",
  // その他必需品
  "医薬品",
  "懐中電灯・電池",
  "カセットコンロ・ガスボンベ",
  "ラップ・アルミホイル",
  "ポリ袋・ゴミ袋",
  "ペットフード",
  "その他（期限のないものなど）",
] as const;

export const FOOD_UNITS = [
  // 基本単位
  "個",
  "袋",
  "缶",
  "本",
  "パック",
  "箱",
  "ロール",
  "組",
  "セット",
  "ボトル",
  "チューブ",
  // 重量・容量
  "kg",
  "g",
  "L",
  "ml",
  // その他
  "杯",
  "枚",
  "束",
  "房",
  "その他",
] as const;

export const CONTAINER_TYPES = [
  "非常持出袋",
  "リュックサック",
  "キャリーケース",
  "防水バッグ",
  "プラスチックケース",
  "段ボール箱",
  "布袋",
  "その他",
] as const;

export const EXPIRY_WARNING_DAYS = {
  NEAR_EXPIRY: 30,
  CRITICAL_EXPIRY: 7,
} as const;

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  TEAM_NAME_MIN_LENGTH: 2,
  TEAM_NAME_MAX_LENGTH: 50,
  FOOD_NAME_MAX_LENGTH: 100,
  QUANTITY_MAX: 9999,
  AMOUNT_MAX: 999999,
} as const;

export const DATE_FORMATS = {
  DISPLAY: "ja-JP",
  INPUT: "YYYY-MM-DD",
  DATETIME: "YYYY-MM-DD HH:mm:ss",
} as const;
