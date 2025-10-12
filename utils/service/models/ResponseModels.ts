import { PracticeType } from "@/utils/data/SPECIALTIES";

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
        poeple: People;
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
        poeple: People;
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

export interface ResetPasswordResponse {
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
    type: PracticeType;
    image?: Media;
    metadata?: PracticeMetadata;
    created_at: string;
    updated_at: string;
}

export interface Member {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: "owner" | "admin" | "member" | "viewer";
    pivot?: {
        role: "owner" | "admin" | "member" | "viewer";
    };
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
    success: true;
    message: string;
    data: Member[];
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
    created_at?: string;
    updated_at?: string;
}

export interface PatientMetadata {
    middle_name?: string;
    pronouns?: string;
    chart_number?: string;
}

export interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    birth_date: string | null;
    gender: "male" | "female" | "other" | null;
    national_id?: string;
    email: string[];
    numbers: string[];
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
    data: PaginatedResponse<Patient>;
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

// ============= File Upload Responses =============
export interface TempUploadResponse {
    filename: string;
    size: number;
    mime_type: string;
}
