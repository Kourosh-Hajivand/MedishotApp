import { AddressLabel, DateLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "./enums";

export type FieldLabel = PhoneLabel | EmailLabel | AddressLabel | DateLabel | URLLabel | string;

export type Address = {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

export interface DynamicFieldItem {
    id: string;
    label: FieldLabel;
    value: string | Address;
}

export interface DynamicInputConfig {
    fieldType: DynamicFieldType;
    fieldTitle: string;
    labelOptions: FieldLabel[];
    placeholder?: string;
}

export interface DynamicInputListProps {
    config: DynamicInputConfig;
    onChange?: (items: DynamicFieldItem[]) => void;
    initialItems?: DynamicFieldItem[];
    error?: string;
}
