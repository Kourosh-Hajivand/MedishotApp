export const routes = {
  baseUrl: 'https://api.medishots.com/api/v1/',

  auth: {
    login: () => 'auth/login',
    register: () => 'auth/register',
    profile: () => 'auth/profile',

    google: () => 'auth/google',
    googleCallback: () => 'auth/google/callback',

    apple: () => 'auth/apple',
    appleCallback: () => 'auth/apple/callback',
  },

  users: {
    getUserById: (id: string | number) => `users/${id}`,
  },

  practice: {
    create: () => 'practices',
    list: () => 'practices',
    getById: (id: string | number) => `practices/${id}`,
    update: (id: string | number) => `practices/${id}`,
    delete: (id: string | number) => `practices/${id}`,
    addMember: (id: string | number) => `practices/${id}/members`,
  },

  patient: {
    create: (practicesId: string | number) =>
      `practices/${practicesId}/patients`,
    list: (practicesId: string | number) => `practices/${practicesId}/patients`,
    getById: (practicesId: string | number, patientsId: string | number) =>
      `practices/${practicesId}/patients/${patientsId}`,
    update: (practicesId: string | number, patientsId: string | number) =>
      `practices/${practicesId}/patients/${patientsId}`,
    delete: (practicesId: string | number, patientsId: string | number) =>
      `practices/${practicesId}/patients/${patientsId}`,
  },

  media: {
    upload: () => '/media/upload',
  },
};
