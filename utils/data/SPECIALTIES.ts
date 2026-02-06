import { AestheticIcon, CosmeticSurgeryIcon, DentistryIcon, DermatologyIcon, GeneralPracticeIcon, OrthodonticsIcon } from "../../assets/icons";

// Practice Type Enum - همگام با API
export enum PracticeType {
    AestheticMedicine = "Aesthetic Medicine",
    Dermatology = "Dermatology",
    Dentistry = "Dentistry",
    Orthodontics = "Orthodontics",
    CosmeticSurgery = "Cosmetic Surgery",
    GeneralPractice = "General Practice",
    Endocrinology = "Endocrinology",
    Gynecology = "Gynecology",
    Neurology = "Neurology",
    Oncology = "Oncology",
    PlasticSurgery = "Plastic Surgery",
    Urology = "Urology",
}

export type SpecialtyOption = {
    id: PracticeType;
    title: string;
    description: string;
    icon: React.ElementType;
    backgroundColor: string;
};

export const SPECIALTIES: SpecialtyOption[] = [
    {
        id: PracticeType.Dentistry,
        title: "Dentistry",
        description: "Focused on dental care, aesthetics, and oral health for every patient.",
        icon: DentistryIcon,
        backgroundColor: "#007AFF",
    },
    {
        id: PracticeType.AestheticMedicine,
        title: "Aesthetic Medicine",
        description: "Combining technology and technique to deliver non-surgical transformations.",
        icon: AestheticIcon,
        backgroundColor: "#32ADE6",
    },
    {
        id: PracticeType.Dermatology,
        title: "Dermatology",
        description: "Dedicated to skin health, rejuvenation, and non-invasive treatments.",
        icon: DermatologyIcon,
        backgroundColor: "#FF9500",
    },

    {
        id: PracticeType.Orthodontics,
        title: "Orthodontics",
        description: "Specialized in teeth alignment and smile design with precision and care.",
        icon: OrthodonticsIcon,
        backgroundColor: "#00C7BE",
    },
    {
        id: PracticeType.CosmeticSurgery,
        title: "Cosmetic Surgery",
        description: "Enhancing beauty through facial and body procedures with artistic finesse.",
        icon: CosmeticSurgeryIcon,
        backgroundColor: "#AF52DE",
    },
    {
        id: PracticeType.GeneralPractice,
        title: "General Practice",
        description: "A versatile practice serving a wide range of patient care needs.",
        icon: GeneralPracticeIcon,
        backgroundColor: "#FF3B30",
    },
];
