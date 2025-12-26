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
        updateProfileFull: () => "profile/update",

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
        update: (id: string | number) => `practises/${id}/update`,
        delete: (id: string | number) => `practises/${id}`,

        // Members
        getMembers: (practiseId: string | number) => `practises/${practiseId}/members`,
        addMember: (practiseId: string | number) => `practises/${practiseId}/members`,
        updateMemberRole: (practiseId: string | number, memberId: string | number) => `practises/${practiseId}/members/${memberId}/role/update`,
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
        updateTag: (practiseId: string | number, tagId: string | number) => `practises/${practiseId}/tags/${tagId}/update`,
        deleteTag: (practiseId: string | number, tagId: string | number) => `practises/${practiseId}/tags/${tagId}`,

        // Templates
        getTemplates: (practiseId: string | number) => `practises/${practiseId}/templates`,
        createTemplate: (practiseId: string | number) => `practises/${practiseId}/templates`,
        getTemplate: (practiseId: string | number, templateId: string | number) => `practises/${practiseId}/templates/${templateId}`,
        updateTemplate: (practiseId: string | number, templateId: string | number) => `practises/${practiseId}/templates/${templateId}/update`,
        deleteTemplate: (practiseId: string | number, templateId: string | number) => `practises/${practiseId}/templates/${templateId}`,

        // Patients
        getPatients: (practiseId: string | number) => `${practiseId}/patients`,
    },

    patients: {
        list: (practiseId: string | number) => `${practiseId}/patients`,
        create: (practiseId: string | number) => `${practiseId}/patients`,

        getById: (patientId: string | number) => `patients/${patientId}`,
        // OpenAPI: POST /patients/{patient}/update (multipart/form-data)
        update: (patientId: string | number) => `patients/${patientId}/update`,
        delete: (patientId: string | number) => `patients/${patientId}`,

        // Media
        getMedia: (patientId: string | number) => `patients/media/${patientId}`,
        uploadMedia: (patientId: string | number) => `patients/media/${patientId}`,
        uploadMediaWithTemplate: (patientId: string | number) => `patients/media/${patientId}/with-template`,
        deleteMedia: (patientId: string | number, mediaId: string | number) => `patients/media/${patientId}/${mediaId}`,
        getTrashMedia: (patientId: string | number) => `patients/media/trash/${patientId}`,
        restoreMedia: (mediaId: string | number) => `patients/media/restore/${mediaId}`,
        editMedia: (mediaId: string | number) => `patients/media/edit-image/${mediaId}`,
        bookmarkMedia: (mediaId: string | number) => `patients/media/${mediaId}/bookmark`,
        unbookmarkMedia: (mediaId: string | number) => `patients/media/${mediaId}/bookmark`,
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
        checkout: (practiseId: string | number) => `practises/${practiseId}/subscription/checkout`,
        checkoutSuccess: (practiseId: string | number) => `practises/${practiseId}/subscription/checkout/success`,
        checkoutCancel: (practiseId: string | number) => `practises/${practiseId}/subscription/checkout/cancel`,
        cancel: (practiseId: string | number) => `practises/${practiseId}/subscription/cancel`,
        resume: (practiseId: string | number) => `practises/${practiseId}/subscription/resume`,
        swap: (practiseId: string | number) => `practises/${practiseId}/subscription/swap`,
        updateAddonLimit: (practiseId: string | number) => `practises/${practiseId}/subscription/addon-limit`,
    },

    contracts: {
        listTemplates: () => "contract-templates",
        getTemplate: (templateId: string | number) => `contract-templates/${templateId}`,
        getPatientContracts: (patientId: string | number) => `patients/${patientId}/contracts`,
        createContract: (patientId: string | number) => `patients/${patientId}/contracts`,
        getContract: (contractId: string | number) => `patient-contracts/${contractId}`,
    },

    gosts: {
        list: () => "gosts",
        getById: (id: string | number) => `gosts/${id}`,
    },

    templates: {
        list: () => "templates",
        getById: (id: string | number) => `templates/${id}`,
    },
};
