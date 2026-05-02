export type AgeGroup =
  | "household_shared"
  | "adult"
  | "child"
  | "infant"
  | "elderly";

export type PetType = "dog" | "cat" | "small_animal" | "bird";

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  household_shared: "世帯共通",
  adult: "大人（18-64歳）",
  child: "子供（6-17歳）",
  infant: "乳幼児（0-5歳）",
  elderly: "高齢者（65歳以上）",
};

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: "犬",
  cat: "猫",
  small_animal: "小動物",
  bird: "鳥",
};

export const AGE_GROUP_EMOJIS: Record<AgeGroup, string> = {
  household_shared: "",
  adult: "",
  child: "",
  infant: "",
  elderly: "",
};

export const PET_TYPE_EMOJIS: Record<PetType, string> = {
  dog: "",
  cat: "",
  small_animal: "",
  bird: "",
};

export interface SupplyItem {
  id: string;
  name: string;
  category?: string;
  notes?: string;
  isEssential?: boolean;
}

export interface AgeGroupChecklist {
  id: string;
  ageGroup: AgeGroup;
  count: number;
  items: SupplyItem[];
  checkedItems: string[];
}

export interface PetChecklist {
  petType: PetType;
  count: number;
  items: SupplyItem[];
  checkedItems: string[];
}

export interface HandbookChecklist {
  ageGroupChecklists: AgeGroupChecklist[];
  petChecklists: PetChecklist[];
  overallProgress: number;
  lastUpdated: Date;
}

export interface HazardMapInfo {
  id: string;
  prefecture: string;
  city: string;
  name: string;
  url: string;
  description?: string;
  lastUpdated?: Date;
}

export interface HazardMapSearchResult {
  prefecture: string;
  cities: HazardMapInfo[];
}

export interface DisasterMessage {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  message: string;
  timestamp: Date;
  isEmergency?: boolean;
  location?: string;
}

export interface HandbookState {
  currentCheckpoint: "supplies" | "hazardmap" | "messages";
  checklist: HandbookChecklist;
  hazardMaps: HazardMapInfo[];
  messages: DisasterMessage[];
  isLoading: boolean;
  error: string | null;
}
