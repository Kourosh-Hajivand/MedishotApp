// ============= Authentication Models =============
export interface LoginBody {
    email: string;
    password: string;
}

export interface InitiateRegistrationBody {
    email: string;
}

export interface CompleteRegistrationBody {
    email: string;
    verification_code: string;
    password: string;
    password_confirmation: string;
}

export interface UpdateProfileBody {
    first_name: string;
    last_name: string;
}

export interface ForgetPasswordBody {
    email: string;
}

export interface VerifyOtpCodeBody {
    email: string;
    code: string;
}

export interface ResetPasswordBody {
    password: string;
    password_confirmation: string;
}

export interface ChangeEmailBody {
    email: string;
    current_password: string;
}

export interface ChangePasswordBody {
    current_password: string;
    password: string;
    password_confirmation: string;
}

export interface UpdateProfileFullBody {
    first_name: string;
    last_name: string;
    gender?: "male" | "female" | "other";
    birth_date?: string; // YYYY-MM-DD format
    metadata?: string; // JSON string containing phones, emails, addresses, urls
    profile_photo?: File | string; // File for direct upload or string for Livewire temp filename
}

export interface AppleIdTokenBody {
    identity_token: string;
    user?: string;
    full_name?: {
        given_name?: string;
        family_name?: string;
        middle_name?: string;
        name_prefix?: string;
        name_suffix?: string;
        nickname?: string;
    };
}

// ============= Practice Models =============
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

export interface CreatePracticeDto {
    name: string;
    type: "Aesthetic Medicine" | "Dermatology" | "Dentistry" | "Orthodontics" | "Cosmetic Surgery" | "General Practice" | "Endocrinology" | "Gynecology" | "Neurology" | "Oncology" | "Plastic Surgery" | "Urology";
    image?: File | string;
    metadata?: string; // JSON string
}

export interface UpdatePracticeDto {
    name: string;
    image?: File | string;
    metadata?: string; // JSON string
}

export interface AddMemberDto {
    first_name: string;
    last_name: string;
    email: string;
    role: "owner" | "doctor" | "staff"; // OpenAPI: enum values
    birth_date?: string; // YYYY-MM-DD format
    gender?: "male" | "female" | "other";
    metadata?: string; // JSON string containing phones, emails, addresses, urls
    profile_photo?: string | File; // Livewire temp filename or File
}

export interface UpdateMemberRoleDto {
    role: "owner" | "doctor" | "staff"; // OpenAPI: update role enum
}

export interface UpdateMemberDto {
    first_name?: string;
    last_name?: string;
    email?: string;
    birth_date?: string; // YYYY-MM-DD format
    gender?: "male" | "female" | "other";
    profile_photo?: File | string; // File for direct upload or string for Livewire temp filename
    metadata?: string; // JSON string
}

export interface TransferOwnershipDto {
    new_owner_id: number;
}

export interface CreateTagDto {
    name: string;
    color?: string;
}

export interface UpdateTagDto {
    name?: string;
    color?: string;
}

export interface GridLayout {
    rows?: number;
    columns?: number;
}

export type LayoutPattern =
    | "left-right"
    | "top-bottom"
    | "left-tall"
    | "top-wide"
    | "right-tall"
    | "top-two"
    | "grid-2x2"
    | "grid-2x2-alt"
    | "grid-2x2-vertical"
    | "grid-2x3"
    | "grid-2x3-alt"
    | "grid-2x3-horizontal"
    | "grid-3x2"
    | "grid-3x3"
    | "grid-3x3-alt"
    | "grid-3x3-horizontal"
    | "grid-4x2"
    | "grid-2x4"
    | "grid-3x3-full"
    | "grid-3x3-full-alt"
    | "grid-3x3-full-horizontal";

export interface CreateTemplateGost {
    gost_id: number;
    order: number;
}

export interface CreateTemplateDto {
    name: string; // Required
    description?: string;
    grid_layout?: GridLayout;
    layout_pattern?: LayoutPattern;
    is_active?: boolean;
    gosts?: number[]; // Array of gost IDs as numbers
}

export interface UpdateTemplateDto {
    name?: string;
    description?: string;
    grid_layout?: GridLayout;
    layout_pattern?: LayoutPattern;
    is_active?: boolean;
    gosts?: number[]; // Array of gost IDs in order
}

// ============= Patient Models =============
export interface PatientContact {
    type: string;
    value: string;
}

export interface PatientAddress {
    type: string;
    value: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    };
}

export interface PatientLink {
    type: string;
    value: string;
}

export interface PatientMetadata {
    middle_name?: string;
    pronouns?: string;
    chart_number?: string;
}

export interface CreatePatientRequest {
    first_name: string;
    last_name: string;
    birth_date?: string;
    gender?: "male" | "female" | "other";
    national_id?: string;
    email?: PatientContact[];
    numbers?: PatientContact[];
    addresses?: PatientAddress[];
    links?: PatientLink[];
    metadata?: PatientMetadata;
    /**
     * OpenAPI: `profile` (multipart/form-data)
     * Backward compatible: some parts of the app still pass `image`
     */
    profile?: File | string;
    image?: File | string;
    id_card?: File | string;
    doctor_id?: string | number;
}

export interface UpdatePatientRequest {
    first_name?: string;
    last_name?: string;
    birth_date?: string;
    gender?: "male" | "female" | "other";
    national_id?: string;
    email?: PatientContact[];
    numbers?: PatientContact[];
    addresses?: PatientAddress[];
    links?: PatientLink[];
    metadata?: PatientMetadata;
    /**
     * OpenAPI: `profile` (multipart/form-data)
     * Backward compatible: some parts of the app still pass `image`
     */
    profile?: File | string;
    image?: File | string;
    id_card?: File | string;
}

// ============= Media Models =============
export interface UploadPatientMediaRequest {
    media: File | string; // File or Livewire temp filename
    type: string;
    data: Record<string, any>;
}

export interface EditPatientMediaRequest {
    media: File | string; // File or Livewire temp filename
}

export interface TempUploadRequest {
    file: File;
}

// ============= Subscription Models =============
export interface SubscribeDto {
    plan_id: number;
    payment_method_id: string;
}

export interface SwapSubscriptionDto {
    plan_id: number;
}

export interface UpdateAddonLimitDto {
    addon_key: string;
    quantity: number;
}

export interface CheckoutDto {
    plan_id: number;
    success_url: string;
    cancel_url: string;
}

// ============= Contract Models =============
export interface CreateContractDto {
    contract_template_id: number;
    body?: string; // Optional override for contract body (JSON string)
    signature_image: File | string; // File or Livewire temp filename
    contract_file?: File | string; // Optional contract file (PDF, DOCX, etc.)
}

// ============= Gost Models =============
// No request models needed for GET endpoints

// ============= Template Models =============
// No request models needed for GET endpoints

// ============= Media with Template Models =============
export interface UploadMediaWithTemplateImage {
    gost_id: number;
    media: File | string; // File or Livewire temp filename
    notes?: string;
}

export interface UploadMediaWithTemplateRequest {
    template_id: number;
    type?: string;
    data?: string; // JSON string
    media?: File | string; // Optional preview/composite image (File or Livewire temp filename)
    images: UploadMediaWithTemplateImage[];
}

// ============= Patient Documents Models =============
export interface CreatePatientDocumentRequest {
    type: string;
    description?: string;
    image: File | string; // File for direct upload or string for Livewire temp filename
}

export interface UpdatePatientDocumentRequest {
    type?: string;
    description?: string;
    image?: File | string; // File for direct upload or string for Livewire temp filename
}
