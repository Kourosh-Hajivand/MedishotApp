export const routes = {
    baseUrl: "https://medishot-back-laravel-black-sun-8585.fly.dev/api/v1/",

    auth: {
        login: () => "auth/login",
        initiateRegistration: () => "auth/initiate-registration",
        completeRegistration: () => "auth/complete-registration",
        logout: () => "auth/logout",
        refresh: () => "auth/refresh",
        me: () => "auth/me",
        updateProfile: () => "auth/update-profile",
        forgetPassword: () => "auth/forget-password",
        verifyOtpCode: () => "auth/verify-otp-code",
        resetPassword: () => "auth/reset-password",
        changeEmail: () => "profile/change-email",
        changePassword: () => "profile/change-password",
        updateProfileFull: () => "profile",

        google: () => "auth/oauth/google/redirect",
        googleCallback: () => "auth/oauth/google/callback",
        googleIdToken: () => "auth/oauth/google/id-token",
        googleConfig: () => "auth/oauth/google/config",

        apple: () => "auth/oauth/apple/redirect",
        appleCallback: () => "auth/oauth/apple/callback",
        appleIdToken: () => "auth/oauth/apple/id-token",
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

        // Statistics
        getPatientsCount: (practiseId: string | number, type: string) => `practises/${practiseId}/patients-count/${type}`,
        getRecentlyPhotos: (practiseId: string | number) => `practises/${practiseId}/recently-photos`,
        getArchivedMedia: (practiseId: string | number) => `practises/${practiseId}/archived-media`,

        // Members
        getMember: (practiseId: string | number, memberId: string | number) => `practises/${practiseId}/members/${memberId}`,

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

        // Patients
        getPatients: (practiseId: string | number) => `${practiseId}/patients`,
    },

    patients: {
        list: (practiseId: string | number) => `${practiseId}/patients`,
        create: (practiseId: string | number) => `${practiseId}/patients`,

        getById: (patientId: string | number) => `patients/${patientId}`,
        update: (patientId: string | number) => `patients/${patientId}`,
        delete: (patientId: string | number) => `patients/${patientId}`,

        // Media
        getMedia: (patientId: string | number) => `patients/media/${patientId}`,
        uploadMedia: (patientId: string | number) => `patients/media/${patientId}`,
        deleteMedia: (patientId: string | number, mediaId: string | number) => `patients/media/${patientId}/${mediaId}`,
        getTrashMedia: (patientId: string | number) => `patients/media/trash/${patientId}`,
        restoreMedia: (mediaId: string | number) => `patients/media/restore/${mediaId}`,
        editMedia: (mediaId: string | number) => `patients/media/edit-image/${mediaId}`,
    },

    doctor: {
        getPatients: () => "doctor/patients",
    },

    media: {
        tempUpload: () => "temp-upload",
    },

    upload: {
        tempUpload: () => "temp-upload",
    },

    plans: {
        list: () => "plans",
        getById: (id: string | number) => `plans/${id}`,
    },

    subscriptions: {
        getStatus: (practiseId: string | number) => `practises/${practiseId}/subscription/status`,
        subscribe: (practiseId: string | number) => `practises/${practiseId}/subscription/subscribe`,
        cancel: (practiseId: string | number) => `practises/${practiseId}/subscription/cancel`,
        resume: (practiseId: string | number) => `practises/${practiseId}/subscription/resume`,
        swap: (practiseId: string | number) => `practises/${practiseId}/subscription/swap`,
        updateAddonLimit: (practiseId: string | number) => `practises/${practiseId}/subscription/addon-limit`,
    },
};
