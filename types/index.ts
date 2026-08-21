export * from "./api";
export * from "./forms";
export * from "./handbook";

export interface BaseFormData {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppUser extends BaseFormData {
  uid: string;
  email: string;
  displayName?: string | null;
  /** 備蓄おすすめ（生理用品など）用途。Firestore users / サーバー側で付与することがある */
  gender?: string | null;
  teamId?: string | null;
  teams?: string[];
  activeTeamId?: string | null;
  lineUserId?: string | null;
}

export interface Team extends BaseFormData {
  id: string;
  name: string;
  password: string;
  members: string[];
  admins: string[];
  ownerId: string;
  createdAt: Date;
  createdBy: string;
  stockSettings?: TeamStockSettings;
}

export type TeamRole = "owner" | "admin" | "member";

export interface TeamMember {
  uid: string;
  email: string;
  displayName?: string | null;
  role: TeamRole;
}

// 備蓄管理設定
export type AgeGroup =
  | "household_shared"
  | "adult"
  | "child"
  | "infant"
  | "elderly";

export interface HouseholdComposition {
  adult: number; // 大人（18-64歳）
  child: number; // 子供（6-17歳）
  infant: number; // 乳幼児（0-5歳）
  elderly: number; // 高齢者（65歳以上）
}

export interface NotificationSettings {
  enabled: boolean; // 通知機能の有効化
  criticalStock: boolean; // 在庫切れ・緊急警告
  expiryNear: boolean; // 賞味期限接近警告
}

export interface TeamStockSettings {
  // 簡易設定（後方互換性のため残す）
  householdSize: number; // 家族の人数（合計）
  stockDays: number; // 目標備蓄日数（初期表示: 3日)
  hasPets: boolean; // ペットの有無
  dogCount?: number; // 犬の数
  catCount?: number; // 猫の数

  // 詳細設定
  useDetailedComposition?: boolean; // 詳細な家族構成を使用するか
  composition?: HouseholdComposition; // 詳細な家族構成

  // 通知設定
  notifications?: NotificationSettings;

  // 備蓄レベル設定
  stockLevel?: "beginner" | "standard" | "advanced"; // 備蓄レベル

  /** 生理用品などを備蓄リストの推奨に含める世帯。未設定時はログインアカウントが男性のみ除外など従来挙動。 */
  needsSanitarySupplies?: boolean;

  updatedAt?: string; // 更新日時
}

export interface ExpiryInfo {
  date: string; // 賞味期限
  quantity: number; // その賞味期限の数量
  addedAt: string; // 追加日時
  purchasePrice?: number; // 購入価格（オプション）
}

export interface Supply {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
  isArchived: boolean;
  category: string;
  unit: string;
  registeredAt: { seconds: number; nanoseconds: number };
  teamId: string;
  uid: string;
  amount?: number | null;
  purchaseLocation?: string | null;
  label?: string | null;
  storageLocation?: string | null;
  expiryDates?: ExpiryInfo[];
  lastConsumedDate?: string;
  consumptionCount?: number;
  zeroStockSince?: string | null;
  reviewCount?: number;
}

// 備蓄履歴（アーカイブされた備蓄品の履歴情報）
export interface SupplyHistory {
  id: string;
  name: string; // 商品名
  category: string; // カテゴリ
  unit: string; // 単位

  // 統計情報
  totalConsumed: number; // 累計消費量
  averageStock: number; // 平均在庫量
  purchaseLocations: string[]; // よく買った場所
  lastUsedDate: string; // 最後に使用した日
  firstRegisteredDate: string; // 最初に登録した日

  // レビュー関連
  hasReviews: boolean; // 感想があるか
  reviewCount: number; // レビュー数
  averageRating?: number; // 平均評価（将来的に実装）

  // メタ情報
  archivedAt: string; // アーカイブ日時
  teamId: string;
  archivedBy: string; // アーカイブしたユーザーID
}

export interface Review {
  id: string;
  supplyId: string;
  userId?: string;
  userName: string;
  text?: string;
  content?: string;
  teamId?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface UseAuthReturn {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

export interface UseTeamReturn {
  teamId: string | null;
  teamIdFromURL: string | null;
  currentTeamId: string | null;
  loading: boolean;
  error: string | null;
}

export interface UseSuppliesReturn {
  supplies: Supply[];
  loading: boolean;
  error: string | null;
  archiveSupply: (supplyId: string) => Promise<void>;
  updateSupply: (supplyId: string) => void;
}
