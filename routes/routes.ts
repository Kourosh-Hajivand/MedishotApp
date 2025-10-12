export const routes = {
    baseUrl: "https://medishot-back-laravel-black-sun-8585.fly.dev/api/v1/",

    auth: {
        login: () => "auth/login",
        initiateRegistration: () => "auth/initiate-registration",
        completeRegistration: () => "auth/complete-registration",
        logout: () => "auth/logout",
        me: () => "auth/me",
        updateProfile: () => "auth/update-profile",
        forgetPassword: () => "auth/forget-password",
        resetPassword: () => "auth/reset-password",

        google: () => "auth/oauth/google/redirect",
        googleCallback: () => "auth/oauth/google/callback",

        apple: () => "auth/oauth/apple/redirect",
        appleCallback: () => "auth/oauth/apple/callback",
        appleConfig: () => "auth/oauth/apple/config",
    },

    practises: {
        list: () => "practises",
        create: () => "practises",
        getById: (id: string | number) => `practises/${id}`,
        update: (id: string | number) => `practises/${id}`,
        delete: (id: string | number) => `practises/${id}`,

        // Members
        getMembers: (practiseId: string | number) => `practises/${practiseId}/members`,
        addMember: (practiseId: string | number) => `practises/${practiseId}/members`,
        updateMemberRole: (practiseId: string | number, memberId: string | number) => `practises/${practiseId}/members/${memberId}/role`,
        removeMember: (practiseId: string | number, memberId: string | number) => `practises/${practiseId}/members/${memberId}`,
        leave: (practiseId: string | number) => `practises/${practiseId}/leave`,
        transferOwnership: (practiseId: string | number) => `practises/${practiseId}/transfer-ownership`,
    },

    patients: {
        list: () => "patients",
        create: () => "patients",
        getById: (patientId: string | number) => `patients/${patientId}`,
        update: (patientId: string | number) => `patients/${patientId}`,
        delete: (patientId: string | number) => `patients/${patientId}`,

        // Media
        getMedia: (patientId: string | number) => `patients/media/${patientId}`,
        uploadMedia: (patientId: string | number) => `patients/media/${patientId}`,
        deleteMedia: (patientId: string | number, mediaId: string | number) => `patients/media/${patientId}/${mediaId}`,
    },

    media: {
        tempUpload: () => "temp-upload",
    },
};
