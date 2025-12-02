// ============= Base Response =============
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ValidationErrorResponse {
  success: false;
  message: string;
  errors: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// ============= Authentication Responses =============
export interface People {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name?: string;
  email: string;
  colors?: string | null;
  is_verified?: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  success: true;
  message: string;
  data: {
    token: string;
    people: People;
  };
}

export interface InitiateRegistrationResponse {
  success: true;
  message: string;
  data: {
    email: string;
    message: string;
  };
}

export interface CompleteRegistrationResponse {
  success: true;
  message: string;
  data: {
    token: string;
    people: People;
  };
}

export interface LogoutResponse {
  success: true;
  message: string;
  data: string;
}

export interface MeResponse {
  success: true;
  message: string;
  data: People;
}

export interface UpdateProfileResponse {
  success: true;
  message: string;
  data: People;
}

export interface ForgetPasswordResponse {
  message: string;
}

export interface VerifyOtpCodeResponse {
  message: string;
  data: {
    token: string;
    people: People;
  };
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangeEmailResponse {
  success: true;
  message: string;
  data: People;
}

export interface ChangePasswordResponse {
  success: true;
  message: string;
}

// ============= OAuth Responses =============
export interface OAuthRedirectResponse {
  redirect_url: string;
}

export interface AppleConfigResponse {
  success: true;
  message: string;
  data: {
    client_id: string;
    redirect_uri: string;
    scope: string;
    response_type: string;
    response_mode: string;
  };
}

// ============= Practice Responses =============
export interface PracticeMetadata {
  zipcode?: number;
  city?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

export interface Practice {
  id: number;
  name: string;
  type: "Aesthetic Medicine" | "Dermatology" | "Dentistry" | "Orthodontics" | "Cosmetic Surgery" | "General Practice" | "Endocrinology" | "Gynecology" | "Neurology" | "Oncology" | "Plastic Surgery" | "Urology";
  image?: Media;
  metadata?: PracticeMetadata;
  created_by?: People;
  patients_count?: number;
  role?: "owner" | "admin" | "member" | "viewer";
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  type: "member";
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: "owner" | "admin" | "member" | "viewer" | "doctor";
  color?: string | null;
  status: "active" | "pending";
  patients_count: number;
  taken_images_count: number;
  activities: Array<{
    description: string;
    created_at: string;
    subject_type: string;
    subject_id: number;
    properties?: Record<string, any>;
  }>;
  joined_at: string;
  updated_at: string;
}

export interface Invitation {
  id: number;
  type: "invitation";
  email: string;
  role: "owner" | "admin" | "member" | "viewer" | "doctor";
  status: "pending";
  invited_at: string;
}

export interface PracticeListResponse {
  success: true;
  message: string;
  data: Practice[];
}

export interface PracticeDetailResponse {
  success: true;
  message: string;
  data: Practice;
}

export interface PracticeMembersResponse {
  success: boolean;
  message: string | null;
  data: {
    members: Member[];
    invitations: Invitation[];
  };
}

export interface PracticeStatsResponse {
  success: true;
  message: string;
  data: Array<{
    date: string;
    count: number;
  }>;
}

export interface PracticeTag {
  id: number;
  practise_id: number;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeTagsResponse {
  success: true;
  message: string;
  data: PracticeTag[];
}

export interface PracticeTagResponse {
  success: true;
  message: string;
  data: PracticeTag;
}

export interface PracticeTemplate {
  id: number;
  practise_id: number;
  name: string;
  description?: string;
  content?: object;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PracticeTemplatesResponse {
  success: true;
  message: string;
  data: PracticeTemplate[];
}

export interface PracticeTemplateResponse {
  success: true;
  message: string;
  data: PracticeTemplate;
}

// ============= Patient Responses =============
export interface Media {
  id: number;
  url: string;
  name?: string;
  file_name?: string;
  mime_type?: string;
  size?: number;
  collection_name?: string;
  model_type?: string;
  model_id?: number;
  disk?: string;
  conversions_disk?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientMetadata {
  middle_name?: string;
  pronouns?: string;
  chart_number?: string;
}

export interface PatientContact {
  type: string;
  value: string;
}

export interface Patient {
  id: number;
  chart_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  national_id?: string;
  email: string[];
  numbers: PatientContact[];
  addresses: string[];
  links: string[];
  metadata?: PatientMetadata;
  doctor?: People;
  profile_image?: Media | null;
  id_card?: Media | null;
  created_at: string;
  updated_at: string;
}

export interface PatientListResponse {
  success: true;
  message: string;
  data: Patient[];
}

export interface PatientDetailResponse {
  success: true;
  message: string;
  data: Patient;
}

// ============= Patient Media Responses =============
export interface PatientMedia {
  id: number;
  patient_id: number;
  patient_type: string;
  data: Record<string, any> | null;
  taker?: People;
  media: Media | null;
}

export interface PatientMediaListResponse {
  success: true;
  message: string;
  data: PatientMedia[];
}

export interface PatientMediaUploadResponse {
  success: true;
  message: string;
  data: PatientMedia;
}

export interface PatientMediaDeleteResponse {
  success: true;
  message: string;
  data: string;
}

export interface PatientMediaTrashResponse {
  success: true;
  message: string;
  data: PatientMediaTrash[];
}

export interface PatientMediaTrash extends PatientMedia {
  deleted_at: string;
}

export interface PatientMediaRestoreResponse {
  success: true;
  message: string;
  data: null;
}

export interface PatientMediaEditResponse {
  success: true;
  message: string;
  id: number;
  patient_id: number;
  patient_type: string;
  data: Record<string, any>;
  original_media?: Media;
  edited_media?: Media;
}

// ============= File Upload Responses =============
export interface TempUploadResponse {
  filename: string;
  size: number;
  mime_type: string;
}

// ============= Practice Statistics Responses =============
export interface PatientsCountItem {
  date: string;
  count: number;
}

export interface PatientsCountResponse {
  success: true;
  message: string;
  data: PatientsCountItem[];
}

export interface RecentlyPhotosResponse {
  success: true;
  message: string;
  data: Media[];
}
