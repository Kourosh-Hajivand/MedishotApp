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
    email: string;
    role: "owner" | "admin" | "member" | "viewer";
}

export interface UpdateMemberRoleDto {
    role: "owner" | "admin" | "member" | "viewer";
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

export interface CreateTemplateDto {
    name: string;
    description?: string;
    content?: object;
    is_active?: boolean;
}

export interface UpdateTemplateDto {
    name?: string;
    description?: string;
    content?: object;
    is_active?: boolean;
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
    email?: string;
    numbers?: PatientContact[];
    addresses?: PatientAddress[];
    links?: PatientLink[];
    metadata?: PatientMetadata;
    image?: File | string;
    id_card?: File | string;
}

export interface UpdatePatientRequest {
    first_name?: string;
    last_name?: string;
    birth_date?: string;
    gender?: "male" | "female" | "other";
    national_id?: string;
    email?: string;
    numbers?: PatientContact[];
    addresses?: PatientAddress[];
    links?: PatientLink[];
    metadata?: PatientMetadata;
    image?: File | string;
    id_card?: File | string;
}

// ============= Media Models =============
export interface UploadPatientMediaRequest {
    media: File | string; // File or Livewire temp filename
    type: string;
    data: Record<string, any>;
}

export interface TempUploadRequest {
    file: File;
}
