import { AvatarIcon } from "@/assets/icons";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicInputConfig } from "@/models";
import { AddressLabel, DateLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { routes } from "@/routes/routes";
import colors from "@/theme/colors";
import { useCreatePatient, useGetPatientById, useTempUpload, useUpdatePatient } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { CreatePatientRequest } from "@/utils/service/models/RequestModels";
import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { BaseText, ControlledInput, DynamicInputList } from "../components";
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

const normalizeAddressValue = (address: any): AddressValue => {
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
            return {
                ...base,
                ...candidate,
                street1: candidate.street1 ?? candidate.street ?? base.street1,
                street2: candidate.street2 ?? candidate.street_extra ?? "",
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
        phone?: string;
        email?: string;
        scannedImageUri?: string;
    }>();

    const { data: patient } = useGetPatientById(params.id ?? "");
    const [localImageUri, setLocalImageUri] = useState<string | null>(null); // Local URI for preview
    const safeAreaInsets = useSafeAreaInsets();
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null); // Filename from server for submit
    const uploadedFilenameRef = useRef<string | null>(null); // Ref to always have latest value
    const [hasUploadedScannedImage, setHasUploadedScannedImage] = useState(false);
    const [idCardImage, setIdCardImage] = useState<string | null>(null);
    const [idCardFilename, setIdCardFilename] = useState<string | null>(null);
    // States for dynamic inputs
    const [phones, setPhones] = useState<any[]>([]);
    const [emails, setEmails] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [urls, setUrls] = useState<any[]>([]);

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors },
        setValue,
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
    const firstName = watch("first_name");
    const lastName = watch("last_name");
    const birthDate = watch("birth_date");
    const gender = watch("gender");

    const isFormValid = firstName?.trim() !== "" && lastName?.trim() !== "";
    const isEditMode = !!params.id;

    const { mutate: createPatient, isPending: isCreating } = useCreatePatient(selectedPractice?.id ?? "", () => {
        router.back();
        router.back();
        router.push("/(tabs)/patients");
    });
    const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient(() => {
        router.back();
    });

    const isPending = isCreating || isUpdating;

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response) => {
            console.log("✅ [uploadImage] Success callback triggered");
            console.log("✅ [uploadImage] Response:", response);
            // Handle both wrapped and unwrapped response structures
            const responseAny = response as any;
            const filename = (responseAny?.data?.filename ?? response.filename) || null;
            console.log("✅ [uploadImage] Filename:", filename);
            setUploadedFilename(filename); // Only save filename for submit, keep local URI for preview
            uploadedFilenameRef.current = filename; // Also update ref to always have latest value
            console.log("✅ [uploadImage] Image uploaded successfully:", filename);
        },
        (error) => {
            console.error("❌ [uploadImage] Error callback triggered");
            console.error("❌ [uploadImage] Error uploading image:", error);
            console.error("❌ [uploadImage] Error message:", error.message);
        },
    );

    const { mutate: uploadIdCardImage, isPending: isUploadingIdCard } = useTempUpload(
        (response) => {
            // Handle both wrapped and unwrapped response structures
            const responseAny = response as any;
            const filename = (responseAny?.data?.filename ?? response.filename) || null;
            setIdCardFilename(filename);
            console.log("✅ [uploadIdCardImage] ID Card image uploaded successfully:", filename);
        },
        (error) => {
            console.error("❌ [uploadIdCardImage] Error uploading ID card image:", error.message);
        },
    );

    const displayIdCardImage = useMemo(() => formatImageUri(idCardImage), [idCardImage]);

    // Auto-fill form with parsed ID card data
    useEffect(() => {
        if (!isEditMode && params.firstName) {
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

                    const file = {
                        uri: params.scannedImageUri,
                        type,
                        name: filename,
                    } as any;

                    // Upload the scanned ID card image
                    uploadIdCardImage(file);
                    setHasUploadedScannedImage(true);
                } catch (err) {
                    console.log("Error preparing scanned ID card image:", err);
                }
            }

            // Set phone number if available
            if (params.phone) {
                setPhones([
                    {
                        id: "phone-0",
                        label: "Mobile",
                        value: params.phone,
                    },
                ]);
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

            // Set address if available
            if (params.address) {
                setAddresses([
                    {
                        id: "address-0",
                        label: "Home",
                        value: normalizeAddressValue(params.address),
                    },
                ]);
            }
        }
    }, [params, isEditMode, setValue, uploadIdCardImage, hasUploadedScannedImage]);

    useEffect(() => {
        if (patient?.data && isEditMode) {
            const patientData = patient.data;
            console.log("====================================");
            console.log(patientData?.addresses);
            console.log("====================================");
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
                const phoneData = patientData.numbers.map((phone: any, index: number) => ({
                    id: `phone-${index}`,
                    label: phone.type,
                    value: phone.value,
                }));
                setPhones(phoneData);
            }

            if (patientData?.email) {
                if (Array.isArray(patientData.email)) {
                    const emailData = patientData.email.map((email: any, index: number) => ({
                        id: `email-${index}`,
                        label: "Personal",
                        value: email,
                    }));
                    setEmails(emailData);
                } else if (typeof patientData.email === "string") {
                    setEmails([
                        {
                            id: "email-0",
                            label: "Personal",
                            value: patientData.email,
                        },
                    ]);
                }
            }

            if (patientData?.addresses && patientData?.addresses?.length > 0) {
                const addressData = patientData.addresses.map((address: any, index: number) => {
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
                const linkData = patientData.links.map((link: any, index: number) => {
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
        const phoneNumbers = phones
            .filter((phone) => phone.value && phone.value.trim() !== "")
            .map((phone) => ({
                type: phone.label,
                value: phone.value,
            }));

        const emailAddresses = emails
            .filter((email) => email.value && email.value.trim() !== "")
            .map((email) => ({
                type: email.label,
                value: email.value,
            }));

        const addressList = addresses
            .filter((address) => address.value && (typeof address.value === "object" ? Object.values(address.value).some((val) => val && typeof val === "string" && val.trim() !== "") : typeof address.value === "string" && address.value.trim() !== ""))
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

        const urlLinks = urls
            .filter((url) => url.value && url.value.trim() !== "")
            .map((url) => ({
                type: url.label,
                value: url.value,
            }));

        const patientData: CreatePatientRequest = {
            first_name: data.first_name,
            last_name: data.last_name,
        };

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
            const emailValue = emailAddresses[0].value?.trim();
            if (emailValue) {
                patientData.email = emailValue;
            }
        }

        if (addressList.length > 0) {
            patientData.addresses = addressList;
        }

        if (urlLinks.length > 0) {
            patientData.links = urlLinks;
        }

        // Only submit filename from server, not local URI
        // Use ref to always get the latest value (avoid closure issues)
        const currentUploadedFilename = uploadedFilenameRef.current || uploadedFilename;
        console.log("🔍 [onSubmit] Checking uploadedFilename (state):", uploadedFilename);
        console.log("🔍 [onSubmit] Checking uploadedFilename (ref):", uploadedFilenameRef.current);
        console.log("🔍 [onSubmit] Using filename:", currentUploadedFilename);

        if (currentUploadedFilename) {
            console.log("📤 [onSubmit] Submitting image filename:", currentUploadedFilename);
            patientData.image = currentUploadedFilename;
        } else {
            console.log("⚠️ [onSubmit] No image filename to submit");
            console.log("⚠️ [onSubmit] uploadedFilename (state):", uploadedFilename);
            console.log("⚠️ [onSubmit] uploadedFilename (ref):", uploadedFilenameRef.current);
        }

        if (idCardFilename) {
            console.log("📤 [onSubmit] Submitting ID card filename:", idCardFilename);
            patientData.id_card = idCardFilename;
        }

        // Log all data being sent to backend
        console.log("═══════════════════════════════════════════════════════════");
        console.log("📤 [onSubmit] DATA BEING SENT TO BACKEND:");
        console.log("═══════════════════════════════════════════════════════════");
        console.log("🏥 Practice ID:", selectedPractice?.id);
        console.log("📋 Patient Data (JSON):", JSON.stringify(patientData, null, 2));
        console.log("📋 Patient Data (Object):", patientData);
        console.log("───────────────────────────────────────────────────────────");
        console.log("📝 Form Data:", {
            first_name: data.first_name,
            last_name: data.last_name,
            birth_date: data.birth_date,
            gender: data.gender,
        });
        console.log("📞 Phone Numbers:", phoneNumbers);
        console.log("📧 Email Addresses:", emailAddresses);
        console.log("📍 Addresses:", addressList);
        console.log("🔗 URL Links:", urlLinks);
        console.log("🖼️ Image Filename (state):", uploadedFilename);
        console.log("🖼️ Image Filename (ref):", uploadedFilenameRef.current);
        console.log("🖼️ Image Filename (using):", currentUploadedFilename);
        console.log("🪪 ID Card Filename:", idCardFilename);
        console.log("═══════════════════════════════════════════════════════════");

        if (isEditMode && params.id) {
            console.log("🔄 [onSubmit] MODE: UPDATE PATIENT");
            console.log("🔄 [onSubmit] Patient ID:", params.id);
            console.log("🔄 [onSubmit] Update Payload:", {
                patientId: params.id,
                data: patientData,
            });
            console.log("🔄 [onSubmit] Calling updatePatient mutation...");

            updatePatient(
                { patientId: params.id, data: patientData },
                {
                    onSuccess: (response) => {
                        console.log("✅ [updatePatient] Success Response:", response);
                        router.push(`/patients/${params.id}`);
                    },
                    onError: (error) => {
                        console.error("❌ [updatePatient] Error:", error);
                        console.error("❌ [updatePatient] Error Details:", JSON.stringify(error, null, 2));
                    },
                },
            );
        } else {
            console.log("➕ [onSubmit] MODE: CREATE NEW PATIENT");
            console.log("➕ [onSubmit] Practice ID:", selectedPractice?.id);
            console.log("➕ [onSubmit] Create Payload:", patientData);
            console.log("➕ [onSubmit] Calling createPatient mutation...");

            createPatient(patientData, {
                onSuccess: (response) => {
                    console.log("✅ [createPatient] Success Response:", response);
                    console.log("✅ [createPatient] Response Data:", JSON.stringify(response, null, 2));
                    router.push("/(tabs)/patients");
                    router.back();
                },
                onError: (error) => {
                    console.error("❌ [createPatient] Error:", error);
                    console.error("❌ [createPatient] Error Details:", JSON.stringify(error, null, 2));
                },
            });
        }
    };

    const handleNext = () => {
        if (!isFormValid) {
            console.log("Form is not valid. Please fill required fields.");
            return;
        }
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
                <Pressable onPress={handleNext} disabled={!isFormValid || isPending} className="px-2">
                    <BaseText type="Body" weight="600" color={isFormValid ? "system.blue" : "system.gray"}>
                        Done
                    </BaseText>
                </Pressable>
            ),
        });
    }, [navigation, isFormValid]);

    useLayoutEffect(() => {
        if (params.id) {
            navigation.setOptions({
                headerTitle: "Edit Patient",
            });
        }
    }, [navigation, params.id]);

    const handleSelectFromGallery = async () => {
        console.log("📸 [handleSelectFromGallery] Starting gallery selection...");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            console.log("❌ [handleSelectFromGallery] Permission denied");
            alert("Permission to access gallery is required!");
            return;
        }
        console.log("✅ [handleSelectFromGallery] Permission granted");

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: false,
        });

        console.log("📸 [handleSelectFromGallery] Image picker result:", {
            canceled: result.canceled,
            assetsCount: result.assets?.length || 0,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            console.log("✅ [handleSelectFromGallery] Image selected:", uri);
            console.log("📸 [handleSelectFromGallery] Setting localImageUri to:", uri);
            setLocalImageUri(uri); // Save local URI for preview

            try {
                const filename = uri.split("/").pop() || "image.jpg";
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : "image/jpeg";

                const file = {
                    uri,
                    type,
                    name: filename,
                } as any;

                console.log("📤 [handleSelectFromGallery] Preparing to upload file:", {
                    uri: file.uri,
                    type: file.type,
                    name: file.name,
                });
                console.log("📤 [handleSelectFromGallery] Calling uploadImage...");
                uploadImage(file);
            } catch (err) {
                console.error("❌ [handleSelectFromGallery] Upload error:", err);
            }
        } else {
            console.log("⚠️ [handleSelectFromGallery] Image selection was canceled or no assets");
        }
    };

    const handleTakePhoto = async () => {
        console.log("📷 [handleTakePhoto] Starting camera...");
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            console.log("❌ [handleTakePhoto] Permission denied");
            alert("Permission to access camera is required!");
            return;
        }
        console.log("✅ [handleTakePhoto] Permission granted");

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            base64: false,
        });

        console.log("📷 [handleTakePhoto] Camera result:", {
            canceled: result.canceled,
            assetsCount: result.assets?.length || 0,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            console.log("✅ [handleTakePhoto] Photo taken:", uri);
            console.log("📸 [handleTakePhoto] Setting localImageUri to:", uri);
            setLocalImageUri(uri); // Save local URI for preview

            try {
                const filename = uri.split("/").pop() || "image.jpg";
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : "image/jpeg";

                const file = {
                    uri,
                    type,
                    name: filename,
                } as any;

                console.log("📤 [handleTakePhoto] Preparing to upload file:", {
                    uri: file.uri,
                    type: file.type,
                    name: file.name,
                });
                console.log("📤 [handleTakePhoto] Calling uploadImage...");
                uploadImage(file);
            } catch (err) {
                console.error("❌ [handleTakePhoto] Upload error:", err);
            }
        } else {
            console.log("⚠️ [handleTakePhoto] Photo capture was canceled or no assets");
        }
    };
    console.log("===============displayIdCardImage=====================");
    console.log(displayIdCardImage);
    console.log("====================================");

    // Debug logs for image state
    console.log("🖼️ [RENDER] localImageUri:", localImageUri);
    console.log("🖼️ [RENDER] uploadedFilename:", uploadedFilename);
    console.log("🖼️ [RENDER] isUploading:", isUploading);
    console.log("🖼️ [RENDER] isPending:", isPending);

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
    console.log("🖼️ [RENDER] displaySelectedImage:", displaySelectedImage);

    return (
        <ScrollView className="flex-1 bg-system-gray6" contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 10, paddingTop: safeAreaInsets.top + 10 }}>
            <View className="flex-1 bg-system-gray6 gap-8">
                <View className="items-center justify-center gap-5">
                    <View className="gap-4 ">
                        <View className="w-32 h-32 rounded-full bg-system-gray2 items-center justify-center">
                            {isUploading ? (
                                // Show loading indicator while uploading
                                <ActivityIndicator size="small" color={colors.system.gray6} />
                            ) : displaySelectedImage ? (
                                // Show preview after upload is complete
                                <Image
                                    source={{ uri: displaySelectedImage }}
                                    className="w-full h-full rounded-full"
                                    onError={(error) => {
                                        console.error("❌ [Image] Error loading image:", error.nativeEvent.error);
                                        console.error("❌ [Image] Failed URI:", displaySelectedImage);
                                    }}
                                    onLoad={() => {
                                        console.log("✅ [Image] Image loaded successfully:", displaySelectedImage);
                                    }}
                                />
                            ) : (
                                // Show default avatar when no image
                                <AvatarIcon width={50} height={50} strokeWidth={0} />
                            )}
                        </View>
                        <Host style={{ width: 110, height: 35 }}>
                            <ContextMenu>
                                <ContextMenu.Items>
                                    <Button systemImage="photo.stack" controlSize="mini" onPress={handleSelectFromGallery}>
                                        Photo from Gallery
                                    </Button>
                                    <Button systemImage="camera" controlSize="mini" onPress={handleTakePhoto}>
                                        with Camera
                                    </Button>
                                </ContextMenu.Items>

                                <ContextMenu.Trigger>
                                    <View className="flex-1 ">
                                        <Host style={{ width: 110, height: 30 }}>
                                            <Button role="default" controlSize="mini" variant="glassProminent">
                                                Pick a Photo
                                            </Button>
                                        </Host>
                                    </View>
                                </ContextMenu.Trigger>
                            </ContextMenu>
                        </Host>
                    </View>
                </View>

                <View className="px-4 gap-4">
                    <View className="bg-white rounded-2xl  px-4">
                        <View className="bg-white rounded-2xl px-4">
                            <View className="border-b border-border ">
                                <ControlledInput control={control} name="first_name" label="First Name" haveBorder={false} error={errors.first_name?.message} />
                            </View>
                            <View className="border-b border-border ">
                                <ControlledInput control={control} name="last_name" label="Last Name" haveBorder={false} error={errors.last_name?.message} />
                            </View>
                            <View className="border-b border-border ">
                                <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} />
                            </View>
                            <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} />
                        </View>
                    </View>
                    {displayIdCardImage && (
                        <View className="bg-white rounded-2xl p-4 flex-row items-start justify-between ">
                            <BaseText type="Body" weight="500" color="labels.primary">
                                ID Card
                            </BaseText>
                            <View className="w-[192px] h-[122px] rounded-xl bg-system-gray6 overflow-hidden">
                                <Image source={{ uri: displayIdCardImage }} className="w-full h-full " resizeMode="cover" />
                            </View>
                        </View>
                    )}
                    <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} initialItems={phones} />
                    <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} initialItems={emails} />
                    <DynamicInputList config={addressConfig} paramKey="address" onChange={setAddresses} initialItems={addresses} />
                    <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} initialItems={urls} />
                </View>
            </View>
        </ScrollView>
    );
};
