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
    gender?: "male" | "female" | "other" | null;
    birth_date?: string | null; // YYYY-MM-DD format
    profile_photo_url?: string | null;
    color?: string | null;
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
    id: string | number; // Can be "user:1" format, number, or string
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: "owner" | "admin" | "member" | "viewer" | "doctor"; // OpenAPI: includes "doctor"
    status: "active";
    patients_count: number;
    taken_images_count: number;
    color?: string | null;
    image?: {
        id: number;
        url: string;
    } | null;
    type?: string;
    activities?: Array<{
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
    data: Member[];
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

// Response for /{practise}/patients - returns simple array
export interface PatientListResponse {
    success: true;
    message: string;
    data: Patient[];
}

// Response for /doctor/patients - returns paginated data
export interface DoctorPatientsResponse {
    success: true;
    message: string;
    data: {
        data: Patient[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        first_page_url?: string;
        last_page_url?: string;
        next_page_url?: string | null;
        prev_page_url?: string | null;
        path?: string;
        links?: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
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
    is_bookmarked?: boolean;
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

export interface PatientMediaTrash extends PatientMedia {
    deleted_at: string;
}

export interface PatientMediaTrashResponse {
    success: true;
    message: string;
    data: PatientMediaTrash[];
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

export interface PatientMediaBookmarkResponse {
    success: true;
    message: string;
    data: null | object;
}

// ============= File Upload Responses =============
export interface TempUploadResponse {
    filename?: string; // Livewire temp filename
    id?: string | number; // File ID from backend
    size?: number;
    mime_type?: string;
}

// ============= Practice Statistics Responses =============
// PatientsCountResponse is the same as PracticeStatsResponse
export type PatientsCountResponse = PracticeStatsResponse;

export interface RecentlyPhotosResponse {
    success: true;
    message: string;
    data: Media[];
}

// ============= Plan & Subscription Responses =============
export interface PlanFeature {
    id: number;
    feature_key: string;
    feature_type: "limit" | "boolean";
    feature_value: string;
    display_name: string;
    description: string;
}

export interface PlanAddon {
    id: number;
    addon_key: string;
    included_quantity: number;
}

export interface Plan {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    billing_interval: "month" | "year";
    is_active: boolean;
    features: PlanFeature[];
    addons: PlanAddon[];
    created_at: string;
    updated_at: string;
}

export interface PlanListResponse {
    data: Plan[];
}

export interface PlanDetailResponse {
    data: Plan;
}

export interface SubscriptionStatus {
    // Standard subscription status structure
    subscribed?: boolean;
    plan?: Plan | null;
    ends_at?: string | null;
    on_grace_period?: boolean;
    trial_ends_at?: string | null;
    
    // New API structure
    current_plan?: Plan;
    has_subscription?: boolean;
    is_active?: boolean;
    is_on_grace_period?: boolean;
    is_on_trial?: boolean;
    limits?: {
        current_doctor_count?: number;
        doctor_limit?: number;
        remaining_doctor_slots?: number;
        [key: string]: any;
    };
    
    // Support for practice detail response structure
    current_subscription?: {
        ends_at: string | null;
        plan: Plan;
        stripe_id: string;
        stripe_status: string;
        trial_ends_at: string | null;
    };
}

export interface SubscriptionStatusResponse {
    data: SubscriptionStatus;
}

export interface CheckoutSessionResponse {
    success: boolean;
    message: string;
    data: {
        session_id: string;
        checkout_url: string;
    };
}

export interface CheckoutSuccessResponse {
    success: boolean;
    message: string;
    data: {
        session_id: string;
        checkout_url: string;
        payment_status: string;
        customer: string;
        subscription: string | null;
    };
}

// ============= Contract Responses =============
export interface ContractTemplateBodyItem {
    type: "paragraph" | "radio_group" | "checkbox_group" | "text_input" | "textarea";
    data: {
        content?: string; // For paragraph type
        label?: string; // For form fields
        options?: string[]; // For radio_group, checkbox_group
        placeholder?: string; // For text inputs
    };
}

export interface ContractTemplate {
    id: number;
    title: string;
    body: ContractTemplateBodyItem[] | string; // Support both old string format and new array format
    preview_image?: string | null; // OpenAPI: preview_image
    image?: string | null; // Backward compatibility
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ContractTemplateListResponse {
    data: ContractTemplate[];
}

export interface ContractTemplateDetailResponse {
    data: ContractTemplate;
}

export interface PatientContract {
    id: number;
    patient_id: number;
    contract_template_id: number;
    body: string;
    signed_at: string | null;
    created_at: string;
    updated_at: string;
    contract_template: ContractTemplate;
    contract_file?: Media | null; // OpenAPI: contract_file
}

export interface PatientContractListResponse {
    data: PatientContract[];
}

export interface PatientContractDetailResponse {
    data: PatientContract;
}

export interface CreateContractResponse {
    message: string;
    data: PatientContract;
}

// ============= Gost Responses =============
export interface GostImage {
    id: number;
    url: string;
}

export interface Gost {
    id: number;
    name: string;
    description: string | null;
    image: GostImage | null;
    gost_image: GostImage | null;
    icon: GostImage | null;
    created_at: string;
    updated_at: string;
}

export interface GostListResponse {
    success: boolean;
    message: string | null;
    data: Gost[];
    links?: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta?: {
        current_page: number;
        from: number;
        last_page: number;
        links: Array<{
            url: string | null;
            label: string;
            page: number | null;
            active: boolean;
        }>;
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
}

export interface GostDetailResponse {
    success: boolean;
    data: Gost;
}

// ============= Template Responses =============
export interface TemplateGridLayout {
    row: number;
    col: number;
    gost_id: number;
}

export interface TemplateCell {
    id: number;
    row_index: number;
    column_index: number;
    gost: Gost;
    created_at: string;
    updated_at: string;
}

export interface Template {
    id: number;
    name: string;
    description: string | null;
    grid_layout: TemplateGridLayout[] | null;
    image: string | null;
    gost_image: string | null;
    icon: string | null;
    cells_count?: number; // OpenAPI: cells_count
    gosts_count?: number; // Backward compatibility
    created_at: string;
    updated_at: string;
}

export interface TemplateListResponse {
    success: boolean;
    data: {
        data: Template[];
        current_page: number;
        per_page: number;
        total: number;
    };
}

export interface TemplateGost {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    gost_image: string | null;
    icon: string | null;
    pivot: {
        template_id: number;
        gost_id: number;
        order: number;
    };
    created_at: string;
    updated_at: string;
}

export interface TemplateWithCells extends Template {
    cells: TemplateCell[]; // OpenAPI: cells array
}

export interface TemplateWithGosts extends Template {
    gosts: TemplateGost[]; // Backward compatibility
}

export interface TemplateDetailResponse {
    success: boolean;
    data: TemplateWithCells;
}

// ============= Patient Media With Template Responses =============
export interface PatientMediaImage {
    id: number;
    patient_media_id: number;
    gost_id: number;
    notes: string | null;
    image: string | null;
    gost: Gost;
    created_at: string;
    updated_at: string;
}

export interface PatientMediaWithTemplate {
    id: number;
    patient_id: number;
    template_id: number | null;
    type: string | null;
    data: Record<string, any> | null;
    taker_id: number | null;
    template: Template | null; // OpenAPI: template field
    images: PatientMediaImage[];
    created_at: string;
    updated_at: string;
}

export interface PatientMediaWithTemplateResponse {
    success: boolean;
    message: string;
    data: PatientMediaWithTemplate;
}
