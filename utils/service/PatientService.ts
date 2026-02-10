import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { CreatePatientRequest, UpdatePatientRequest } from "./models/RequestModels";
import { ApiResponse, DoctorPatientsResponse, PatientActivitiesResponse, PatientDetailResponse, PatientListResponse } from "./models/ResponseModels";

const {
    baseUrl,
    patients: { list, create, getArchived, getById, update, delete: deleteRoute, archive, unarchive, getActivities },
    doctor: { getPatients: getDoctorPatientsRoute },
} = routes;

export interface GetPatientsParams {
    doctor_id?: string | number;
    page?: number;
    per_page?: number;
}

function normalizePracticeId(id: string | number | undefined): string | number | undefined {
    if (id == null) return undefined;
    if (typeof id === "number" && !Number.isNaN(id)) return id;
    if (typeof id === "string" && id.startsWith("http")) {
        const match = id.match(/\/(\d+)(?:\/|$)/);
        return match ? match[1] : id;
    }
    return id;
}

const PatientService = {
    // Patient Management
    getPatients: async (practiseId: string | number, params?: GetPatientsParams): Promise<PatientListResponse> => {
        try {
            const id = normalizePracticeId(practiseId);
            if (id == null) throw new Error("Practice ID is required");

            const queryParams = new URLSearchParams();
            if (params?.doctor_id) {
                queryParams.append("doctor_id", String(params.doctor_id));
            }
            if (params?.page) {
                queryParams.append("page", String(params.page));
            }
            if (params?.per_page) {
                queryParams.append("per_page", String(params.per_page));
            }

            const url = baseUrl + list(id) + (queryParams.toString() ? `?${queryParams.toString()}` : "");
            const response: AxiosResponse<PatientListResponse> = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patients failed");
            }
            throw error;
        }
    },

    // Get Doctor's Patients
    getDoctorPatients: async (params?: { page?: number; per_page?: number }): Promise<DoctorPatientsResponse> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) {
                queryParams.append("page", String(params.page));
            }
            if (params?.per_page) {
                queryParams.append("per_page", String(params.per_page));
            }

            const url = baseUrl + getDoctorPatientsRoute() + (queryParams.toString() ? `?${queryParams.toString()}` : "");
            const response: AxiosResponse<DoctorPatientsResponse> = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get doctor patients failed");
            }
            throw error;
        }
    },

    createPatient: async (practiseId: string | number, payload: CreatePatientRequest): Promise<PatientDetailResponse> => {
        try {
            const formData = new FormData();

            formData.append("first_name", payload.first_name);
            formData.append("last_name", payload.last_name);

            if (payload.birth_date) {
                formData.append("birth_date", payload.birth_date);
            }
            if (payload.gender) {
                formData.append("gender", payload.gender);
            }
            if (payload.national_id) {
                formData.append("national_id", payload.national_id);
            }
            if (payload.chart_number != null) {
                formData.append("chart_number", String(payload.chart_number));
            }

            if (payload.numbers) {
                payload.numbers.forEach((number, index) => {
                    formData.append(`numbers[${index}][type]`, number.type);
                    formData.append(`numbers[${index}][value]`, number.value);
                });
            }

            if (payload.email) {
                payload.email.forEach((email, index) => {
                    formData.append(`email[${index}][type]`, email.type);
                    formData.append(`email[${index}][value]`, email.value);
                });
            }

            if (payload.addresses) {
                payload.addresses.forEach((address, index) => {
                    formData.append(`addresses[${index}][type]`, address.type);
                    Object.entries(address.value).forEach(([key, value]) => {
                        if (value) {
                            formData.append(`addresses[${index}][value][${key}]`, value);
                        }
                    });
                });
            }

            if (payload.links) {
                payload.links.forEach((link, index) => {
                    formData.append(`links[${index}][type]`, link.type);
                    formData.append(`links[${index}][value]`, link.value);
                });
            }

            if (payload.metadata) {
                Object.entries(payload.metadata).forEach(([key, value]) => {
                    if (value) {
                        formData.append(`metadata[${key}]`, value);
                    }
                });
            }

            // OpenAPI expects `profile` - keep backward compatibility with `image`
            const profile = payload.profile ?? payload.image;
            if (profile) {
                formData.append("profile", profile);
            }

            if (payload.id_card) {
                formData.append("id_card", payload.id_card);
            }

            // OpenAPI: doctor_id should be in the request body
            if (payload.doctor_id) {
                formData.append("doctor_id", String(payload.doctor_id));
            }

            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.post(baseUrl + create(practiseId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Create patient failed");
            }
            throw error;
        }
    },

    getPatientById: async (patientId: string | number): Promise<PatientDetailResponse> => {
        try {
            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.get(baseUrl + getById(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patient failed");
            }
            throw error;
        }
    },

    updatePatient: async (patientId: string | number, payload: UpdatePatientRequest): Promise<PatientDetailResponse> => {
        try {
            const formData = new FormData();

            if (payload.first_name) {
                formData.append("first_name", payload.first_name);
            }
            if (payload.last_name) {
                formData.append("last_name", payload.last_name);
            }
            if (payload.birth_date) {
                formData.append("birth_date", payload.birth_date);
            }
            if (payload.gender) {
                formData.append("gender", payload.gender);
            }
            if (payload.national_id) {
                formData.append("national_id", payload.national_id);
            }

            if (payload.numbers) {
                payload.numbers.forEach((number, index) => {
                    formData.append(`numbers[${index}][type]`, number.type);
                    formData.append(`numbers[${index}][value]`, number.value);
                });
            }

            if (payload.email) {
                payload.email.forEach((email, index) => {
                    formData.append(`email[${index}][type]`, email.type);
                    formData.append(`email[${index}][value]`, email.value);
                });
            }

            if (payload.addresses) {
                payload.addresses.forEach((address, index) => {
                    formData.append(`addresses[${index}][type]`, address.type);
                    Object.entries(address.value).forEach(([key, value]) => {
                        if (value) {
                            formData.append(`addresses[${index}][value][${key}]`, value);
                        }
                    });
                });
            }

            if (payload.links) {
                payload.links.forEach((link, index) => {
                    formData.append(`links[${index}][type]`, link.type);
                    formData.append(`links[${index}][value]`, link.value);
                });
            }

            if (payload.metadata) {
                Object.entries(payload.metadata).forEach(([key, value]) => {
                    if (value) {
                        formData.append(`metadata[${key}]`, value);
                    }
                });
            }

            // OpenAPI expects `profile` - keep backward compatibility with `image`
            const profile = payload.profile ?? payload.image;
            if (profile) {
                formData.append("profile", profile);
            }

            if (payload.id_card) {
                formData.append("id_card", payload.id_card);
            }

            // OpenAPI: POST /patients/{patient}/update
            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.post(baseUrl + update(patientId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update patient failed");
            }
            throw error;
        }
    },

    deletePatient: async (patientId: string | number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deleteRoute(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete patient failed");
            }
            throw error;
        }
    },

    // Get archived patients
    getArchivedPatients: async (practiseId: string | number, params?: GetPatientsParams): Promise<PatientListResponse> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.doctor_id) {
                queryParams.append("doctor_id", String(params.doctor_id));
            }
            if (params?.page) {
                queryParams.append("page", String(params.page));
            }
            if (params?.per_page) {
                queryParams.append("per_page", String(params.per_page));
            }

            const url = baseUrl + getArchived(practiseId) + (queryParams.toString() ? `?${queryParams.toString()}` : "");
            const response: AxiosResponse<PatientListResponse> = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get archived patients failed");
            }
            throw error;
        }
    },

    // Archive patient
    archivePatient: async (patientId: string | number): Promise<PatientDetailResponse> => {
        try {
            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.post(baseUrl + archive(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Archive patient failed");
            }
            throw error;
        }
    },

    // Unarchive patient
    unarchivePatient: async (patientId: string | number): Promise<PatientDetailResponse> => {
        try {
            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.post(baseUrl + unarchive(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Unarchive patient failed");
            }
            throw error;
        }
    },

    // Get patient activities
    getPatientActivities: async (practiseId: string | number, patientId: string | number): Promise<PatientActivitiesResponse> => {
        try {
            const response: AxiosResponse<PatientActivitiesResponse> = await axiosInstance.get(baseUrl + getActivities(practiseId, patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patient activities failed");
            }
            throw error;
        }
    },
};

export default PatientService;
