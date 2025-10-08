export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
}

export interface CreatePracticeDto {
  name: string;
  description: string;
  metadata: PracticeMetadata;
  practiceType: string;
}

export interface PracticeMetadata {
  website?: string;
  email: string;
  phone: string;
  address: string;
}

export interface UpdatePracticeDto {
  name?: string;
  description?: string;
  metadata?: PracticeMetadata;
  practiceType?: string;
}

export interface AddMemberDto {
  userId: number;
}
export interface CreatePatientRequest {
  name: string;
  email: string;
  phone: string;
}

export interface UpdatePatientRequest {
  name?: string;
  email?: string;
  phone?: string;
}
