import { PhotoTemplate, TemplateCategory } from "../types/camera.types";

// Default Face Templates
export const FACE_TEMPLATES: PhotoTemplate[] = [
    {
        id: "face-front",
        name: "Front Face",
        category: "face",
        overlayImage: null, // Will be replaced with actual SVG
        description: "Standard front-facing portrait",
    },
    {
        id: "face-left-45",
        name: "Left 45°",
        category: "face",
        overlayImage: null,
        description: "Left side 45 degree angle",
    },
    {
        id: "face-right-45",
        name: "Right 45°",
        category: "face",
        overlayImage: null,
        description: "Right side 45 degree angle",
    },
    {
        id: "face-left-90",
        name: "Left Profile",
        category: "face",
        overlayImage: null,
        description: "Full left profile view",
    },
    {
        id: "face-right-90",
        name: "Right Profile",
        category: "face",
        overlayImage: null,
        description: "Full right profile view",
    },
];

// Teeth Templates
export const TEETH_TEMPLATES: PhotoTemplate[] = [
    {
        id: "teeth-front",
        name: "Front Smile",
        category: "teeth",
        overlayImage: null,
        description: "Front view with teeth showing",
    },
    {
        id: "teeth-upper",
        name: "Upper Teeth",
        category: "teeth",
        overlayImage: null,
        description: "Close-up of upper teeth",
    },
    {
        id: "teeth-lower",
        name: "Lower Teeth",
        category: "teeth",
        overlayImage: null,
        description: "Close-up of lower teeth",
    },
    {
        id: "teeth-bite-right",
        name: "Right Bite",
        category: "teeth",
        overlayImage: null,
        description: "Right side bite view",
    },
    {
        id: "teeth-bite-left",
        name: "Left Bite",
        category: "teeth",
        overlayImage: null,
        description: "Left side bite view",
    },
];

// Body Templates
export const BODY_TEMPLATES: PhotoTemplate[] = [
    {
        id: "body-front",
        name: "Body Front",
        category: "body",
        overlayImage: null,
        description: "Full body front view",
    },
    {
        id: "body-side",
        name: "Body Side",
        category: "body",
        overlayImage: null,
        description: "Full body side view",
    },
];

// Template Categories
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
    {
        id: "face",
        name: "Face",
        icon: "face.smiling",
        templates: FACE_TEMPLATES,
    },
    {
        id: "teeth",
        name: "Teeth",
        icon: "mouth",
        templates: TEETH_TEMPLATES,
    },
    {
        id: "body",
        name: "Body",
        icon: "figure.stand",
        templates: BODY_TEMPLATES,
    },
];

// Get all templates
export const getAllTemplates = (): PhotoTemplate[] => {
    return [...FACE_TEMPLATES, ...TEETH_TEMPLATES, ...BODY_TEMPLATES];
};

// Get templates by category
export const getTemplatesByCategory = (category: string): PhotoTemplate[] => {
    const categoryData = TEMPLATE_CATEGORIES.find((c) => c.id === category);
    return categoryData?.templates || [];
};

// Get template by ID
export const getTemplateById = (id: string): PhotoTemplate | undefined => {
    return getAllTemplates().find((t) => t.id === id);
};
