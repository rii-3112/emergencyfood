export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface FirebaseDocument {
  id: string;
  createdAt: any;
  updatedAt?: any;
}

export interface SupplyDocument extends FirebaseDocument {
  name: string;
  quantity: number;
  expiryDate: string;
  isArchived: boolean;
  category: string;
  unit: string;
  amount?: number | null;
  purchaseLocation?: string | null;
  label?: string | null;
  storageLocation?: string;
  registeredAt: any;
  teamId: string;
  uid: string;
}

export interface TeamDocument extends FirebaseDocument {
  name: string;
  adminUids: string[];
  memberUids: string[];
  inviteCode: string;
}

export interface UserDocument extends FirebaseDocument {
  email: string;
  displayName?: string;
  teamId?: string;
  isAdmin?: boolean;
}

export type ApiOperation = "create" | "read" | "update" | "delete" | "list";

export interface CreateRequest<T> {
  data: Omit<T, keyof FirebaseDocument>;
}

export interface UpdateRequest<T> {
  id: string;
  data: Partial<Omit<T, keyof FirebaseDocument>>;
}

export interface ListRequest {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
