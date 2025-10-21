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
        verifyOtpCode: () => "auth/verify-otp-code",
        resetPassword: () => "auth/reset-password",

        google: () => "auth/oauth/google/redirect",
        googleCallback: () => "auth/oauth/google/id-token",

        apple: () => "auth/oauth/apple/redirect",
        appleCallback: () => "auth/oauth/apple/callback",
        appleConfig: () => "auth/oauth/apple/config",
    },

    profile: {
        changeEmail: () => "profile/change-email",
        changePassword: () => "profile/change-password",
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

        // Statistics
        getPatientsCount: (practiseId: string | number, type: string) => `practises/${practiseId}/patients-count/${type}`,

        // Tags
        getTags: (practiseId: string | number) => `practises/${practiseId}/tags`,
        createTag: (practiseId: string | number) => `practises/${practiseId}/tags`,
        getTag: (practiseId: string | number, tagId: string | number) => `practises/${practiseId}/tags/${tagId}`,
        updateTag: (practiseId: string | number, tagId: string | number) => `practises/${practiseId}/tags/${tagId}`,
        deleteTag: (practiseId: string | number, tagId: string | number) => `practises/${practiseId}/tags/${tagId}`,

        // Templates
        getTemplates: (practiseId: string | number) => `practises/${practiseId}/templates`,
        createTemplate: (practiseId: string | number) => `practises/${practiseId}/templates`,
        getTemplate: (practiseId: string | number, templateId: string | number) => `practises/${practiseId}/templates/${templateId}`,
        updateTemplate: (practiseId: string | number, templateId: string | number) => `practises/${practiseId}/templates/${templateId}`,
        deleteTemplate: (practiseId: string | number, templateId: string | number) => `practises/${practiseId}/templates/${templateId}`,
    },

    patients: {
        list: (practiseId: string | number) => `${practiseId}/patients`,
        create: (practiseId: string | number) => `${practiseId}/patients`,
        doctorList: () => `doctor/patients`,
        getById: (patientId: string | number) => `patients/${patientId}`,
        update: (patientId: string | number) => `patients/${patientId}`,
        delete: (patientId: string | number) => `patients/${patientId}`,

        // Media
        getMedia: (patientId: string | number) => `patients/media/${patientId}`,
        uploadMedia: (patientId: string | number) => `patients/media/${patientId}`,
        deleteMedia: (patientId: string | number, mediaId: string | number) => `patients/media/${patientId}/${mediaId}`,
        getTrashMedia: (patientId: string | number) => `patients/media/trash/${patientId}`,
        restoreMedia: (mediaId: string | number) => `patients/media/restore/${mediaId}`,
    },

    doctor: {
        getPatients: () => "doctor/patients",
    },

    media: {
        tempUpload: () => "temp-upload",
    },
};
