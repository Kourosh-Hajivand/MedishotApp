import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { CreatePatientRequest, UpdatePatientRequest } from "./models/RequestModels";
import { ApiResponse, PatientDetailResponse, PatientListResponse } from "./models/ResponseModels";

const {
    baseUrl,
    patients: { list, create, doctorList, getById, update, delete: deleteRoute },
} = routes;

const PatientService = {
    // Patient Management
    getPatients: async (practiseId: string | number, page: number = 1, perPage: number = 15): Promise<PatientListResponse> => {
        try {
            const response: AxiosResponse<PatientListResponse> = await axiosInstance.get(baseUrl + list(practiseId), {
                params: { page, per_page: perPage },
            });
            console.log("==============baseUrl + list(practiseId)======================");
            console.log(baseUrl + list(practiseId));
            console.log("====================================");
            return response.data;
        } catch (error) {
            console.error("Error in GetPatients:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patients failed");
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
            if (payload.email) {
                formData.append("email", payload.email);
            }

            if (payload.numbers) {
                payload.numbers.forEach((number, index) => {
                    formData.append(`numbers[${index}][type]`, number.type);
                    formData.append(`numbers[${index}][value]`, number.value);
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

            if (payload.image) {
                formData.append("image", payload.image);
            }

            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.post(baseUrl + create(practiseId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            console.error("Error in CreatePatient:", error);
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
            console.error("Error in GetPatientById:", error);
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
            if (payload.email) {
                formData.append("email", payload.email);
            }

            if (payload.numbers) {
                payload.numbers.forEach((number, index) => {
                    formData.append(`numbers[${index}][type]`, number.type);
                    formData.append(`numbers[${index}][value]`, number.value);
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

            if (payload.image) {
                formData.append("image", payload.image);
            }

            const response: AxiosResponse<PatientDetailResponse> = await axiosInstance.put(baseUrl + update(patientId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            console.error("Error in UpdatePatient:", error);
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
            console.error("Error in DeletePatient:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete patient failed");
            }
            throw error;
        }
    },

    // Doctor Patients
    getDoctorPatients: async (page: number = 1, perPage: number = 15): Promise<PatientListResponse> => {
        try {
            const response: AxiosResponse<PatientListResponse> = await axiosInstance.get(baseUrl + doctorList(), {
                params: { page, per_page: perPage },
            });
            return response.data;
        } catch (error) {
            console.error("Error in GetDoctorPatients:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get doctor patients failed");
            }
            throw error;
        }
    },
};

export default PatientService;
