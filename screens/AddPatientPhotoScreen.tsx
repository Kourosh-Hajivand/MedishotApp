import { AvatarIcon } from "@/assets/icons";
import Avatar from "@/components/avatar";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicInputConfig } from "@/models";
import { AddressLabel, DateLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { routes } from "@/routes/routes";
import colors from "@/theme/colors";
import { toE164 } from "@/utils/helper/phoneUtils";
import { useCreatePatient, useGetNextChartNumber, useGetPatientById, useGetPracticeMembers, useTempUpload, useUpdatePatient } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { CreatePatientRequest } from "@/utils/service/models/RequestModels";
import { Member } from "@/utils/service/models/ResponseModels";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { BaseButton, BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper, KeyboardAwareScrollView } from "../components";
import { IconSymbol } from "../components/ui/icon-symbol";
const schema = z.object({
    first_name: z.string().min(1, "First Name is required."),
    last_name: z.string().min(1, "Last Name is required."),
    birth_date: z.string().min(1, "Birth Date is required."),
    gender: z.string().min(1, "Gender is required."),
});

type FormData = z.infer<typeof schema>;

type AddressValue = {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

const createEmptyAddressValue = (): AddressValue => ({
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
});

const normalizeAddressValue = (address: string | AddressValue | { value?: string | AddressValue } | null | undefined): AddressValue => {
    const base = createEmptyAddressValue();

    if (!address) {
        return base;
    }

    if (typeof address === "string") {
        return { ...base, street1: address };
    }

    if (typeof address === "object") {
        const candidate = "value" in address ? address.value : address;
        if (candidate && typeof candidate === "object") {
            const addr = candidate as AddressValue & Record<string, unknown>;
            return {
                ...base,
                ...addr,
                street1: addr.street1 ?? (addr.street as string) ?? base.street1,
                street2: addr.street2 ?? (addr.street_extra as string) ?? "",
            };
        }
    }

    return base;
};

const API_BASE_URL = routes.baseUrl.replace(/\/+$/, "");
const STORAGE_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, "");

const formatImageUri = (uri: string | null): string | null => {
    if (!uri) return null;

    const trimmed = uri.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("file://") || trimmed.startsWith("content://")) {
        return trimmed;
    }

    let normalized = trimmed;

    if (!/^https?:\/\//i.test(normalized)) {
        const base = STORAGE_BASE_URL || API_BASE_URL;
        normalized = `${base}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
    }

    const parts = normalized.split("://");
    if (parts.length === 2) {
        const [protocol, rest] = parts;
        normalized = `${protocol}://${rest.replace(/\/{2,}/g, "/")}`;
    }

    return normalized;
};

export const AddPatientPhotoScreen: React.FC = () => {
    const router = useRouter();
    const navigation = useNavigation();

    const params = useLocalSearchParams<{
        id?: string;
        firstName?: string;
        lastName?: string;
        birthDate?: string;
        gender?: string;
        idNumber?: string;
        address?: string;
        addressStreet?: string;
        addressCity?: string;
        addressState?: string;
        addressZip?: string;
        phone?: string;
        email?: string;
        scannedImageUri?: string;
        doctor_id?: string;
        doctor?: string; // JSON string of doctor object
    }>();

    const { data: patient } = useGetPatientById(params.id ?? "");

    const [localImageUri, setLocalImageUri] = useState<string | null>(null); // Local URI for preview
    const safeAreaInsets = useSafeAreaInsets();
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null); // Filename from server for submit
    const uploadedFilenameRef = useRef<string | null>(null); // Ref to always have latest value
    const [hasUploadedScannedImage, setHasUploadedScannedImage] = useState(false);
    const [hasAppliedScannedData, setHasAppliedScannedData] = useState(false); // Track if scanned data has been applied
    const [idCardImage, setIdCardImage] = useState<string | null>(null);
    const [idCardFilename, setIdCardFilename] = useState<string | null>(null);
    interface DynamicFieldItem {
        id: string;
        label: string;
        value: string | AddressValue;
    }

    // States for dynamic inputs
    const [phones, setPhones] = useState<DynamicFieldItem[]>([]);
    const phonesRef = useRef<DynamicFieldItem[]>([]);
    const [emails, setEmails] = useState<DynamicFieldItem[]>([]);
    const emailsRef = useRef<DynamicFieldItem[]>([]);
    const [addresses, setAddresses] = useState<DynamicFieldItem[]>([]);
    const addressesRef = useRef<DynamicFieldItem[]>([]);
    const [urls, setUrls] = useState<DynamicFieldItem[]>([]);
    const urlsRef = useRef<DynamicFieldItem[]>([]);

    // Error states for dynamic fields
    const [phoneError, setPhoneError] = useState<string>("");
    const [emailError, setEmailError] = useState<string>("");
    const [addressError, setAddressError] = useState<string>("");

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors },
        setValue,
        trigger,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            first_name: "",
            last_name: "",
            birth_date: "",
            gender: "",
        },
    });
    const { selectedPractice } = useProfileStore();
    const { profile, isAuthenticated } = useAuth();
    const isEditMode = !!params.id;
    const { data: practiceMembers } = useGetPracticeMembers(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id);
    const { data: nextChartNumberData } = useGetNextChartNumber(selectedPractice?.id ?? 0, isAuthenticated === true && !!selectedPractice?.id && !isEditMode);
    const firstName = watch("first_name");
    const lastName = watch("last_name");
    const birthDate = watch("birth_date");
    const gender = watch("gender");

    // For create mode: require at least 1 phone, 1 email, 1 address
    const hasValidPhone = useMemo(() => {
        return phones.some((phone) => {
            if (!phone?.value) return false;
            const valueStr = String(phone.value).trim();
            if (valueStr === "" || valueStr === "+1") return false;
            return !!toE164(valueStr);
        });
    }, [phones]);

    const hasValidEmail = useMemo(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emails.some((email) => email.value && typeof email.value === "string" && emailRegex.test(email.value.trim()));
    }, [emails]);

    const hasValidAddress = useMemo(() => {
        return addresses.some((address) => {
            if (!address.value) return false;
            if (typeof address.value === "object") {
                const addr = address.value as AddressValue;
                // Require at least street1 or city to be filled
                const hasStreet = (addr.street1?.trim() || "") !== "";
                const hasCity = (addr.city?.trim() || "") !== "";
                return hasStreet || hasCity;
            }
            return typeof address.value === "string" && address.value.trim() !== "";
        });
    }, [addresses]);

    const isFormValid = useMemo(() => {
        const baseValid = firstName?.trim() !== "" && lastName?.trim() !== "";
        if (isEditMode) {
            return baseValid;
        }
        // Create mode: require phone, email, address
        return baseValid && hasValidPhone && hasValidEmail && hasValidAddress;
    }, [firstName, lastName, isEditMode, hasValidPhone, hasValidEmail, hasValidAddress]);

    // Get doctor information from params or practice members
    const selectedDoctor = useMemo(() => {
        // First, try to get from params.doctor (JSON string)
        if (params.doctor) {
            try {
                return JSON.parse(params.doctor) as Member;
            } catch {
                // If parsing fails, continue to other methods
            }
        }

        // If doctor_id is provided, find doctor from practice members
        if (params.doctor_id && practiceMembers?.data) {
            const doctorId = params.doctor_id;
            const doctor = practiceMembers.data.find((member) => {
                const memberId = typeof member.id === "number" ? String(member.id) : member.id.includes(":") ? member.id.split(":")[1] : member.id;
                return memberId === doctorId && (member.role === "doctor" || member.role === "owner");
            });
            if (doctor) return doctor;
        }

        // If user is doctor, use their own info
        if (profile && practiceMembers?.data) {
            const currentMember = practiceMembers.data.find((member) => member.email === profile.email);
            if (currentMember && (currentMember.role === "doctor" || currentMember.role === "owner")) {
                return currentMember;
            }
        }

        // If patient has doctor info in edit mode
        if (isEditMode && patient?.data?.doctor) {
            // Convert patient.doctor (People) to Member format if needed
            const doctorData = patient.data.doctor;
            return {
                id: doctorData.id || "",
                first_name: doctorData.first_name || null,
                last_name: doctorData.last_name || null,
                email: doctorData.email || "",
                role: "doctor" as const,
                status: "active" as const,
                patients_count: 0,
                taken_images_count: 0,
                color: doctorData.color || null,
                image: doctorData.profile_photo_url ? { id: 0, url: doctorData.profile_photo_url } : null,
                joined_at: "",
                updated_at: "",
            } as Member;
        }

        return null;
    }, [params.doctor, params.doctor_id, practiceMembers?.data, profile, isEditMode, patient?.data]);

    // Get doctor display name
    const doctorName = useMemo(() => {
        if (!selectedDoctor) return "Not assigned";
        if (selectedDoctor.first_name && selectedDoctor.last_name) {
            return `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`;
        }
        return selectedDoctor.email;
    }, [selectedDoctor]);

    const { mutate: createPatient, isPending: isCreating } = useCreatePatient(
        selectedPractice?.id ?? "",
        (data) => {
            // Navigate to the newly created patient's detail page
            if (data?.data?.id) {
                router.back();
                router.back();
                router.dismissAll();
                router.push(`/patients/${data.data.id}`);
            }
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to create patient. Please try again.");
        },
    );
    const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient(
        () => {
            router.back();
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to update patient. Please try again.");
        },
    );

    const isPending = isCreating || isUpdating;

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response) => {
            // Handle both wrapped and unwrapped response structures
            interface TempUploadResponse {
                filename?: string;
                data?: { filename?: string };
            }
            const tempResponse = response as TempUploadResponse | { data: TempUploadResponse };
            const filename = ("data" in tempResponse ? tempResponse.data?.filename : (response as TempUploadResponse).filename) || null;
            setUploadedFilename(filename); // Only save filename for submit, keep local URI for preview
            uploadedFilenameRef.current = filename; // Also update ref to always have latest value
        },
        (error) => {
            setLocalImageUri(null);
            setUploadedFilename(null);
        },
    );

    const { mutate: uploadIdCardImage, isPending: isUploadingIdCard } = useTempUpload(
        (response) => {
            // Handle both wrapped and unwrapped response structures
            interface TempUploadResponse {
                filename?: string;
                data?: { filename?: string };
            }
            const tempResponse = response as TempUploadResponse | { data: TempUploadResponse };
            const filename = ("data" in tempResponse ? tempResponse.data?.filename : (response as TempUploadResponse).filename) || null;
            setIdCardFilename(filename);
        },
        (error) => {
            setIdCardImage(null);
            setIdCardFilename(null);
        },
    );

    const displayIdCardImage = useMemo(() => formatImageUri(idCardImage), [idCardImage]);

    // Auto-fill form with parsed ID card data (only once when scanned data is first available)
    useEffect(() => {
        // Only apply scanned data once, and only if we haven't applied it yet
        if (!isEditMode && params.firstName && !hasAppliedScannedData) {
            // Auto-fill from scanned ID card data
            if (params.firstName) {
                setValue("first_name", params.firstName);
            }
            if (params.lastName) {
                setValue("last_name", params.lastName);
            }
            if (params.birthDate) {
                setValue("birth_date", params.birthDate);
            }
            if (params.gender) {
                // Convert to lowercase for form (backend format)
                const genderValue = params.gender.toLowerCase();
                setValue("gender", genderValue);
            }

            // Set scanned ID card image if available (don't set as profile image)
            if (params.scannedImageUri && !hasUploadedScannedImage) {
                setIdCardImage(params.scannedImageUri);
                // Upload the scanned ID card image automatically
                try {
                    const filename = params.scannedImageUri.split("/").pop() || "scanned-id.jpg";
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : "image/jpeg";

                    interface FileUpload {
                        uri: string;
                        type: string;
                        name: string;
                    }

                    const file: FileUpload = {
                        uri: params.scannedImageUri,
                        type,
                        name: filename,
                    };

                    // Upload the scanned ID card image
                    uploadIdCardImage(file);
                    setHasUploadedScannedImage(true);
                } catch (err) {
                    // Error handled silently
                }
            }

            // Set phone number if available (convert to E.164 format)
            if (params.phone) {
                const e164Phone = toE164(params.phone);
                if (e164Phone) {
                    const phoneData = [
                        {
                            id: "phone-0",
                            label: "Mobile",
                            value: e164Phone,
                        },
                    ];
                    setPhones(phoneData);
                    phonesRef.current = phoneData;
                }
            }

            // Set email if available
            if (params.email) {
                setEmails([
                    {
                        id: "email-0",
                        label: "Personal",
                        value: params.email,
                    },
                ]);
            }

            // Set address if available (structured from scan or single string)
            const hasStructuredAddress = params.addressCity != null || params.addressState != null || params.addressZip != null;
            if (params.address || hasStructuredAddress) {
                const street1 = params.addressStreet ?? params.address ?? "";
                const addressValue: AddressValue = hasStructuredAddress
                    ? {
                          ...createEmptyAddressValue(),
                          street1,
                          city: params.addressCity ?? "",
                          state: params.addressState ?? "",
                          zip: params.addressZip ?? "",
                          country: "United States",
                      }
                    : normalizeAddressValue(params.address);
                setAddresses([
                    {
                        id: "address-0",
                        label: "Home",
                        value: addressValue,
                    },
                ]);
            }

            // Mark that scanned data has been applied
            setHasAppliedScannedData(true);
        }
    }, [params.firstName, params.lastName, params.birthDate, params.gender, params.phone, params.email, params.address, params.addressStreet, params.addressCity, params.addressState, params.addressZip, params.scannedImageUri, isEditMode, setValue, uploadIdCardImage, hasUploadedScannedImage, hasAppliedScannedData]);

    useEffect(() => {
        if (patient?.data && isEditMode) {
            const patientData = patient.data;
            setValue("first_name", patientData.first_name || "");
            setValue("last_name", patientData.last_name || "");
            setValue("birth_date", patientData.birth_date || "");
            setValue("gender", patientData.gender || "");

            if (patientData.profile_image?.url) {
                // In edit mode, save the URL as uploadedFilename for submit
                // Don't set localImageUri so we use formatted URL for preview
                setUploadedFilename(patientData.profile_image.url);
                uploadedFilenameRef.current = patientData.profile_image.url; // Also update ref
            }

            if (patientData.id_card?.url) {
                setIdCardImage(patientData.id_card.url);
                setIdCardFilename(patientData.id_card.url);
            }

            if (patientData?.numbers && patientData?.numbers?.length > 0) {
                interface PhoneItem {
                    type?: string;
                    value: string;
                }

                const phoneData = patientData.numbers
                    .map((phone: PhoneItem, index: number) => {
                        if (!phone || !phone.value) return null;

                        const phoneValue = String(phone.value).trim();
                        // Convert to E.164 format (handles both E.164 and formatted formats)
                        const e164Value = toE164(phoneValue);

                        // Only include if valid E.164 format
                        if (e164Value) {
                            return {
                                id: `phone-${index}`,
                                label: phone.type || "Mobile",
                                value: e164Value,
                            };
                        }
                        return null;
                    })
                    .filter((phone): phone is { id: string; label: string; value: string } => phone !== null);
                setPhones(phoneData);
                phonesRef.current = phoneData;
            }

            if (patientData?.email) {
                if (Array.isArray(patientData.email)) {
                    interface EmailItem {
                        type?: string;
                        value?: string;
                    }
                    const emailData = patientData.email.map((email: EmailItem | string, index: number) => {
                        if (typeof email === "object" && email !== null && "value" in email) {
                            return {
                                id: `email-${index}-${(email as EmailItem).value ?? index}`,
                                label: (email as EmailItem).type || "Personal",
                                value: (email as EmailItem).value ?? "",
                            };
                        }
                        return {
                            id: `email-${index}`,
                            label: "Personal",
                            value: typeof email === "string" ? email : "",
                        };
                    });
                    setEmails(emailData);
                    emailsRef.current = emailData;
                } else if (typeof patientData.email === "string") {
                    const singleEmail = [
                        {
                            id: "email-0",
                            label: "Personal",
                            value: patientData.email,
                        },
                    ];
                    setEmails(singleEmail);
                    emailsRef.current = singleEmail;
                }
            }

            if (patientData?.addresses && patientData?.addresses?.length > 0) {
                interface AddressItem {
                    type?: string;
                    value?: string | AddressValue;
                }

                const addressData = patientData.addresses.map((address: AddressItem | string, index: number) => {
                    const label = typeof address === "object" && address?.type ? address.type : "Home";
                    const valueSource = typeof address === "object" && "value" in address ? address.value : address;
                    return {
                        id: `address-${index}`,
                        label,
                        value: normalizeAddressValue(valueSource),
                    };
                });
                setAddresses(addressData);
            }

            if (patientData?.links && patientData?.links?.length > 0) {
                interface LinkItem {
                    type?: string;
                    value?: string;
                }

                const linkData = patientData.links.map((link: LinkItem | string, index: number) => {
                    if (typeof link === "string") {
                        return {
                            id: `link-${index}`,
                            label: "Other",
                            value: link,
                        };
                    }
                    return {
                        id: `link-${index}`,
                        label: link?.type || "Other",
                        value: link?.value || "",
                    };
                });
                setUrls(linkData);
            }
        }
    }, [patient, isEditMode, setValue]);

    const onSubmit = (data: FormData) => {
        // Use ref to always get the latest phones value (avoid closure issues)
        const currentPhones = phonesRef.current;

        // Re-validate required contact fields for create mode
        if (!isEditMode) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const hasPhone = currentPhones.some((p) => p?.value && toE164(String(p.value).trim()));
            const hasEmail = emailsRef.current.some((e) => e?.value && typeof e.value === "string" && emailRegex.test(e.value.trim()));
            const hasAddress = addressesRef.current.some((a) => {
                if (!a?.value) return false;
                if (typeof a.value === "object") {
                    const addr = a.value as AddressValue;
                    return (addr.street1?.trim() || "") !== "" || (addr.city?.trim() || "") !== "";
                }
                return typeof a.value === "string" && a.value.trim() !== "";
            });
            if (!hasPhone || !hasEmail || !hasAddress) {
                const missing: string[] = [];
                if (!hasPhone) missing.push("a valid phone number");
                if (!hasEmail) missing.push("a valid email address");
                if (!hasAddress) missing.push("an address (street or city)");
                Alert.alert("Required Fields", `Please provide at least ${missing.join(", ")}.`);
                return;
            }
        }

        // Convert phone values to E.164 format (+1XXXXXXXXXX)
        // Import toE164 at the top of the file
        const phoneNumbers = currentPhones
            .filter((phone) => {
                if (!phone || !phone.value) return false;
                const valueStr = String(phone.value).trim();
                return valueStr !== "" && valueStr !== "+1";
            })
            .map((phone) => {
                const phoneValue = String(phone.value).trim();
                // Convert to E.164 format (will return empty string if invalid)
                const e164Value = toE164(phoneValue);

                // Only include if valid E.164 format
                if (e164Value) {
                    return {
                        type: phone.label || "Mobile",
                        value: e164Value,
                    };
                }
                return null;
            })
            .filter((phone) => phone !== null) as Array<{ type: string; value: string }>;

        const emailAddresses = emailsRef.current
            .filter((email) => email.value && typeof email.value === "string" && email.value.trim() !== "")
            .map((email) => ({
                type: email.label || "Personal",
                value: (email.value as string).trim(),
            }));

        const addressList = addressesRef.current
            .filter((address) => {
                if (!address.value) return false;
                if (typeof address.value === "object") return Object.values(address.value).some((val) => val && typeof val === "string" && (val as string).trim() !== "");
                return typeof address.value === "string" && address.value.trim() !== "";
            })
            .map((address) => ({
                type: address.label,
                value:
                    typeof address.value === "object"
                        ? address.value
                        : {
                              street1: (address.value as string) ?? "",
                              street2: "",
                              city: "",
                              state: "",
                              zip: "",
                              country: "United States",
                          },
            }));

        const urlLinks = urlsRef.current
            .filter((url) => url.value && typeof url.value === "string" && url.value.trim() !== "")
            .map((url) => ({
                type: url.label,
                value: (url.value as string).trim(),
            }));

        const patientData: CreatePatientRequest = {
            first_name: data.first_name,
            last_name: data.last_name,
        };

        // Add doctor_id if provided from route params
        if (params.doctor_id) {
            patientData.doctor_id = params.doctor_id;
        }

        // Add chart_number from next chart number API (only in create mode)
        if (!isEditMode && nextChartNumberData?.data?.chart_number != null) {
            patientData.chart_number = nextChartNumberData.data.chart_number;
        }

        const birthDateValue = data.birth_date?.trim();
        if (birthDateValue) {
            patientData.birth_date = birthDateValue;
        }

        const genderValue = data.gender?.trim().toLowerCase();
        if (genderValue === "male" || genderValue === "female" || genderValue === "other") {
            patientData.gender = genderValue;
        }

        if (phoneNumbers.length > 0) {
            patientData.numbers = phoneNumbers;
        }

        if (emailAddresses.length > 0) {
            patientData.email = emailAddresses;
        }

        if (addressList.length > 0) {
            patientData.addresses = addressList;
        }

        if (urlLinks.length > 0) {
            patientData.links = urlLinks;
        }

        // Only submit image if user has changed/selected a new image
        // Check if localImageUri exists (means user selected a new image)
        // Or if it's create mode and we have an uploaded filename
        const currentUploadedFilename = uploadedFilenameRef.current || uploadedFilename;
        const originalImageUrl = patient?.data?.profile_image?.url || null;

        // Only include image if:
        // 1. In create mode and we have an uploaded filename (new image selected)
        // 2. In edit mode: if we have a new uploaded filename that's different from original, or if localImageUri exists (user selected new image)
        if (!isEditMode && currentUploadedFilename) {
            // Create mode: include image if we have one
            patientData.image = currentUploadedFilename;
        } else if (isEditMode) {
            // Edit mode: include image if:
            // - User selected a new image (localImageUri exists) AND we have uploadedFilename
            // - OR we have a new uploadedFilename that's different from the original
            const hasNewImage = localImageUri && currentUploadedFilename;
            const hasDifferentUploadedImage = currentUploadedFilename && currentUploadedFilename !== originalImageUrl;

            if (hasNewImage || hasDifferentUploadedImage) {
                patientData.image = currentUploadedFilename;
            }
        }

        // Only send id_card when it is a newly uploaded file (temp filename), not the existing URL from server
        const isIdCardNewUpload = idCardFilename && !idCardFilename.startsWith("http");
        if (isIdCardNewUpload) {
            patientData.id_card = idCardFilename;
        }

        if (isEditMode && params.id) {
            updatePatient(
                { patientId: params.id, data: patientData },
                {
                    onSuccess: () => {
                        router.push(`/patients/${params.id}`);
                    },
                },
            );
        } else {
            createPatient(patientData, {
                onSuccess: (data) => {
                    // Navigate to the newly created patient's detail page
                    if (data?.data?.id) {
                        // Dismiss all modals first, then navigate to patient detail
                        router.dismissAll();
                        // Use setTimeout to ensure dismissAll completes before navigation
                        setTimeout(() => {
                            router.replace(`/patients/${data.data.id}`);
                        }, 100);
                    }
                },
            });
        }
    };

    const handleNext = async () => {
        // Trigger form validation first
        const isValid = await trigger();

        if (!isFormValid) {
            if (!isEditMode) {
                // Set error messages for dynamic fields
                if (!hasValidPhone) {
                    setPhoneError("Please enter at least one valid phone number.");
                } else setPhoneError("");

                if (!hasValidEmail) {
                    setEmailError("Please enter at least one valid email address (e.g., name@example.com).");
                } else setEmailError("");

                if (!hasValidAddress) {
                    setAddressError("Please provide at least one address (street or city is required).");
                } else setAddressError("");

                const missing: string[] = [];

                if (firstName?.trim() === "") missing.push("First name");
                if (lastName?.trim() === "") missing.push("Last name");
                if (!hasValidPhone) missing.push("a valid phone number");
                if (!hasValidEmail) missing.push("a valid email address");
                if (!hasValidAddress) missing.push("an address");

                Alert.alert("Missing Required Information", `Please complete the following required fields: ${missing.join(", ")}.`);
            } else {
                const missing: string[] = [];

                if (firstName?.trim() === "") missing.push("First name");
                if (lastName?.trim() === "") missing.push("Last name");

                if (missing.length > 0) {
                    Alert.alert("Missing Required Information", `${missing.join(", ")}.`);
                }
            }

            return;
        }
        // Clear errors if valid
        setPhoneError("");
        setEmailError("");
        setAddressError("");

        handleSubmit(onSubmit)();
    };
    const phoneConfig: DynamicInputConfig = {
        fieldType: DynamicFieldType.Phone,
        fieldTitle: "phone number",
        labelOptions: [PhoneLabel.Mobile, PhoneLabel.Home, PhoneLabel.Work, PhoneLabel.iPhone, PhoneLabel.Main, PhoneLabel.Other],
        placeholder: "Enter phone number",
    };

    const emailConfig: DynamicInputConfig = {
        fieldType: DynamicFieldType.Email,
        fieldTitle: "email",
        labelOptions: [EmailLabel.Home, EmailLabel.Work, EmailLabel.iCloud, EmailLabel.Personal, EmailLabel.Other],
        placeholder: "Enter email address",
    };

    const addressConfig: DynamicInputConfig = {
        fieldType: DynamicFieldType.Address,
        fieldTitle: "address",
        labelOptions: [AddressLabel.Home, AddressLabel.Work, AddressLabel.Other],
        placeholder: "Enter address",
    };

    const dateConfig: DynamicInputConfig = {
        fieldType: DynamicFieldType.Date,
        fieldTitle: "important date",
        labelOptions: [DateLabel.Birthday, DateLabel.Anniversary, DateLabel.Other],
        placeholder: "Select date",
    };

    const urlConfig: DynamicInputConfig = {
        fieldType: DynamicFieldType.URL,
        fieldTitle: "URL",
        labelOptions: [URLLabel.Instagram, URLLabel.Facebook, URLLabel.Twitter, URLLabel.LinkedIn, URLLabel.YouTube, URLLabel.TikTok, URLLabel.Telegram, URLLabel.WhatsApp, URLLabel.Other],
        placeholder: "Enter URL",
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable onPress={handleNext} disabled={isPending} className="px-2">
                    {isPending ? (
                        <ActivityIndicator size="small" color={colors.system.blue} />
                    ) : (
                        <BaseText type="Body" weight="600" color="system.blue">
                            Done
                        </BaseText>
                    )}
                </Pressable>
            ),
        });
    }, [navigation, isPending, handleNext]);

    useLayoutEffect(() => {
        if (params.id) {
            navigation.setOptions({
                headerTitle: "Edit Patient",
            });
        }
    }, [navigation, params.id]);

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        setLocalImageUri(result.uri); // Save local URI for preview

        try {
            const filename = result.uri.split("/").pop() || "image.jpg";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            interface FileUpload {
                uri: string;
                type: string;
                name: string;
            }

            const file: FileUpload = {
                uri: result.uri,
                type,
                name: filename,
            };

            uploadImage(file);
        } catch (err) {
            // Error handled silently
        }
    };

    // Use local URI for preview (new images) or formatted URI for existing images from server
    // Don't show preview while uploading - show loading instead
    const displaySelectedImage = useMemo(() => {
        // If uploading, don't show preview (will show loading)
        if (isUploading) {
            return null;
        }
        // If we have local URI (new image), show it
        if (localImageUri) {
            return localImageUri;
        }
        // Existing image from server: format the URI
        return formatImageUri(uploadedFilename);
    }, [localImageUri, uploadedFilename, isUploading]);

    return (
        <KeyboardAwareScrollView className="flex-1 bg-system-gray6" contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 10, paddingTop: safeAreaInsets.top + 10 }}>
            <View className="flex-1 bg-system-gray6 gap-4">
                <View className="items-center justify-center gap-5">
                    <ImagePickerWrapper onImageSelected={handleImageSelected}>
                        <View className="relative gap-4">
                            <View style={{ width: 120, height: 120, borderRadius: 64, backgroundColor: colors.system.gray2, alignItems: "center", justifyContent: "center" }}>
                                {isUploading ? (
                                    // Show loading indicator while uploading
                                    <ActivityIndicator size="small" color={colors.system.gray6} />
                                ) : displaySelectedImage ? (
                                    // Show preview after upload is complete
                                    <Image source={{ uri: displaySelectedImage }} style={{ width: "100%", height: "100%", borderRadius: 64 }} />
                                ) : (
                                    // Show default avatar when no image
                                    <AvatarIcon width={50} height={50} strokeWidth={0} />
                                )}
                            </View>

                            <View className="w-full items-center justify-center  ">
                                <View className="w-fit">
                                    <BaseButton
                                        label={displaySelectedImage ? "Edit Photo" : "Pick a Photo"}
                                        leftIcon={displaySelectedImage ? <IconSymbol name="pencil" size={14} color={colors.system.blue} /> : <IconSymbol name="plus" size={14} color={colors.system.blue} />}
                                        ButtonStyle="Tinted"
                                        size="Small"
                                        rounded={true}
                                        style={{ pointerEvents: "none" }}
                                    />
                                </View>
                            </View>
                        </View>
                    </ImagePickerWrapper>
                </View>

                <View className="px-4 gap-4">
                    <View className="bg-white rounded-2xl">
                        <View className="bg-white rounded-2xl">
                            <View>
                                <ControlledInput control={control} name="first_name" label="First Name" haveBorder={false} error={errors.first_name?.message} />
                            </View>
                            <View className="border-b border-border w-[96%] ml-auto"></View>
                            <View>
                                <ControlledInput control={control} name="last_name" label="Last Name" haveBorder={false} error={errors.last_name?.message} />
                            </View>
                            <View className="border-b border-border w-[96%] ml-auto"></View>
                            <View>
                                <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} />
                            </View>
                            <View className="border-b border-border w-[96%] ml-auto"></View>
                            <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} />
                        </View>
                    </View>

                    {!isEditMode && nextChartNumberData?.data?.chart_number != null && (
                        <View className="bg-white rounded-2xl px-5 p-4 flex-row items-center justify-between">
                            <BaseText type="Body" weight="400" color="labels.primary">
                                Chart Number:
                            </BaseText>
                            <BaseText type="Callout" weight={600} color="labels.primary">
                                #{nextChartNumberData.data.chart_number}
                            </BaseText>
                        </View>
                    )}

                    {selectedDoctor && (
                        <View className="bg-white rounded-2xl px-5 p-4 flex-row items-center justify-between ">
                            <BaseText type="Body" weight="400" color="labels.primary">
                                Doctor:
                            </BaseText>
                            <View className="flex-row items-center gap-2.5">
                                <Avatar haveRing name={doctorName} size={40} color={selectedDoctor.color} imageUrl={selectedDoctor.image?.url} />
                                <View>
                                    <BaseText type="Callout" weight={600} color="labels.primary">
                                        Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                                    </BaseText>
                                </View>
                            </View>
                        </View>
                    )}

                    {displayIdCardImage && (
                        <View className="bg-white rounded-2xl p-4 flex-row items-start justify-between ">
                            <BaseText type="Body" weight="400" color="labels.primary">
                                ID Card
                            </BaseText>
                            <View className="w-[192px] h-[122px] rounded-xl bg-system-gray6 overflow-hidden">
                                <Image source={{ uri: displayIdCardImage }} className="w-full h-full " resizeMode="cover" />
                            </View>
                        </View>
                    )}
                    <DynamicInputList
                        config={phoneConfig}
                        paramKey="phone"
                        onChange={(items) => {
                            setPhones(items);
                            phonesRef.current = items;
                            // Only clear error when at least one valid phone exists
                            const hasValid = items.some((p) => p?.value && toE164(String(p.value).trim()));
                            if (hasValid) setPhoneError("");
                        }}
                        initialItems={phones}
                        error={phoneError}
                    />
                    <DynamicInputList
                        config={emailConfig}
                        paramKey="email"
                        onChange={(items) => {
                            setEmails(items);
                            emailsRef.current = items;
                            // Only clear error when at least one valid email exists
                            const hasValid = items.some((e) => e?.value && typeof e.value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim()));
                            if (hasValid) setEmailError("");
                        }}
                        initialItems={emails}
                        error={emailError}
                    />
                    <DynamicInputList
                        config={addressConfig}
                        paramKey="address"
                        onChange={(items) => {
                            setAddresses(items);
                            addressesRef.current = items;
                            // Only clear error when at least one valid address exists (street1 or city required)
                            const hasValid = items.some((a) => {
                                if (!a?.value) return false;
                                if (typeof a.value === "object") {
                                    const addr = a.value as AddressValue;
                                    return (addr.street1?.trim() || "") !== "" || (addr.city?.trim() || "") !== "";
                                }
                                return typeof a.value === "string" && a.value.trim() !== "";
                            });
                            if (hasValid) setAddressError("");
                        }}
                        initialItems={addresses}
                        error={addressError}
                    />
                    <DynamicInputList
                        config={urlConfig}
                        paramKey="url"
                        onChange={(items) => {
                            setUrls(items);
                            urlsRef.current = items;
                        }}
                        initialItems={urls}
                    />
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};
