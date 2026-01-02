// Camera Flow Types

export interface PhotoTemplate {
    id: string;
    name: string;
    category: "face" | "teeth" | "body" | "custom";
    overlayImage: any; // require() image or URI
    description?: string;
    isCustom?: boolean;
}

export interface CapturedPhoto {
    id: string;
    uri: string;
    templateId: string;
    templateName: string;
    timestamp: number;
    isCompleted: boolean;
    mediaId?: number | string; // ID from backend after upload
    uploadStatus?: "pending" | "uploading" | "success" | "error"; // Upload status
    tempFilename?: string; // Filename from temp-upload service
}

export interface PatientInfo {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    doctorName: string;
}

export interface CameraFlowParams {
    patientId: string;
    patientName: string;
    patientAvatar?: string;
    doctorName: string;
}

export interface TemplateCategory {
    id: string;
    name: string;
    icon: string;
    templates: PhotoTemplate[];
}

export type FlashMode = "off" | "on" | "auto";
export type CameraPosition = "front" | "back";

export interface CameraState {
    flashMode: FlashMode;
    cameraPosition: CameraPosition;
    isGridEnabled: boolean;
    zoomLevel: number;
}
