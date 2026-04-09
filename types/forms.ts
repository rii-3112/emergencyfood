export interface BaseFormData {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplyFormData extends BaseFormData {
  name: string;
  quantity: number;
  expiryDate: string;
  category: string;
  unit: string;
  amount?: string | number | null;
  purchaseLocation?: string | null;
  label?: string | null;
  storageLocation?: string | null;
}

export interface FormError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormError[];
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

export type FormMode = "add" | "edit" | "view";

export type DisasterType = "earthquake" | "tsunami" | "flood" | "typhoon";

export interface EvacuationSite {
  id?: string;
  disasterType: DisasterType;
  name: string;
  address: string;
  notes?: string;
}

export interface EvacuationRoute {
  id?: string;
  name: string;
  description: string;
  landmarks?: string;
  notes?: string;
}

export interface SafetyConfirmationMethod {
  id?: string;
  method: string;
  contact: string;
  priority: number;
  notes?: string;
}

export interface FamilyAgreement {
  id?: string;
  title: string;
  description: string;
  category: string;
}

export interface DisasterBoardData extends BaseFormData {
  evacuationSites: EvacuationSite[];
  evacuationRoutes: EvacuationRoute[];
  safetyMethods: SafetyConfirmationMethod[];
  familyAgreements: FamilyAgreement[];
  useDisasterDial: boolean;
  lastUpdated?: Date;
  lastUpdatedBy?: string;
}

export interface BaseFormProps {
  mode?: FormMode;
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export interface SupplyFormProps extends BaseFormProps {
  uid: string | null;
  teamId: string | null;
  supplyId?: string;
  initialData?: SupplyFormData;
}
