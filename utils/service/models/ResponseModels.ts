export interface LoginResponse {
  data: {
    user: {
      id: number;
      email: string;
    };
    token: {
      access_token: string;
      ttl: number;
    };
  };
}

export interface RegisterResponse {
  data: {
    user: {
      id: number;
      email: string;
    };
    token: {
      access_token: string;
      ttl: number;
    };
  };
}

export interface ProfileResponse {
  data: {
    userId: number;
    email: string;
  };
}

export interface PracticeResponse {
  id: number;
  name: string;
  description: string;
  metadata: {
    website: string;
    email: string;
    phone: string;
    address: string;
  };
  practiceType: string;
  members: string[];
}

export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  practiceId: number;
}
