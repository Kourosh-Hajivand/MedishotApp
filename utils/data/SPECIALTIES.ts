import {
  AestheticIcon,
  GeneralPracticeIcon,
  DermatologyIcon,
  DentistryIcon,
  OrthodonticsIcon,
  CosmeticSurgeryIcon,
} from '../../assets/icons';

export type SpecialtyOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  backgroundColor: string;
};

export const SPECIALTIES: SpecialtyOption[] = [
  {
    id: 'Aesthetic Medicine',
    title: 'Aesthetic Medicine',
    description:
      'Combining technology and technique to deliver non-surgical transformations.',
    icon: AestheticIcon,
    backgroundColor: '#32ADE6',
  },
  {
    id: 'Dermatology',
    title: 'Dermatology',
    description:
      'Dedicated to skin health, rejuvenation, and non-invasive treatments.',
    icon: DermatologyIcon,
    backgroundColor: '#FF9500',
  },
  {
    id: 'Dentistry',
    title: 'Dentistry',
    description:
      'Focused on dental care, aesthetics, and oral health for every patient.',
    icon: DentistryIcon,
    backgroundColor: '#007AFF',
  },
  {
    id: 'Orthodontics',
    title: 'Orthodontics',
    description:
      'Specialized in teeth alignment and smile design with precision and care.',
    icon: OrthodonticsIcon,
    backgroundColor: '#00C7BE',
  },
  {
    id: 'Cosmetic Surgery',
    title: 'Cosmetic Surgery',
    description:
      'Enhancing beauty through facial and body procedures with artistic finesse.',
    icon: CosmeticSurgeryIcon,
    backgroundColor: '#AF52DE',
  },
  {
    id: 'General Practice',
    title: 'General Practice',
    description:
      'A versatile practice serving a wide range of patient care needs.',
    icon: GeneralPracticeIcon,
    backgroundColor: '#FF3B30',
  },
];
