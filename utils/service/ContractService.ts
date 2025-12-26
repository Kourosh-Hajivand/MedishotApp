import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { CreateContractDto } from "./models/RequestModels";
import { ContractTemplateDetailResponse, ContractTemplateListResponse, CreateContractResponse, PatientContractDetailResponse, PatientContractListResponse } from "./models/ResponseModels";

const {
    baseUrl,
    contracts: { listTemplates, getTemplate, getPatientContracts, createContract, getContract },
} = routes;

export const ContractService = {
    // ============= Contract Templates =============

    // Get all active contract templates
    getContractTemplates: async (): Promise<ContractTemplateListResponse> => {
        try {
            const response: AxiosResponse<ContractTemplateListResponse> = await axiosInstance.get(baseUrl + listTemplates());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get contract templates");
            }
            throw error;
        }
    },

    // Get a specific contract template
    getContractTemplate: async (templateId: string | number): Promise<ContractTemplateDetailResponse> => {
        try {
            const response: AxiosResponse<ContractTemplateDetailResponse> = await axiosInstance.get(baseUrl + getTemplate(templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get contract template");
            }
            throw error;
        }
    },

    // ============= Patient Contracts =============

    // Get all contracts for a patient
    getPatientContracts: async (patientId: string | number): Promise<PatientContractListResponse> => {
        try {
            const response: AxiosResponse<PatientContractListResponse> = await axiosInstance.get(baseUrl + getPatientContracts(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get patient contracts");
            }
            throw error;
        }
    },

    // Create and sign a new contract for a patient
    createContract: async (patientId: string | number, data: CreateContractDto): Promise<CreateContractResponse> => {
        try {
            const formData = new FormData();
            formData.append("contract_template_id", String(data.contract_template_id));

            if (data.body) {
                formData.append("body", data.body);
            }

            // Support both File and string (Livewire temp filename)
            if (typeof data.signature_image === "string") {
                formData.append("signature_image", data.signature_image);
            } else {
                formData.append("signature_image", data.signature_image);
            }

            const response: AxiosResponse<CreateContractResponse> = await axiosInstance.post(baseUrl + createContract(patientId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to create contract");
            }
            throw error;
        }
    },

    // Get a specific patient contract
    getContract: async (contractId: string | number): Promise<PatientContractDetailResponse> => {
        try {
            const response: AxiosResponse<PatientContractDetailResponse> = await axiosInstance.get(baseUrl + getContract(contractId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get contract");
            }
            throw error;
        }
    },
};
