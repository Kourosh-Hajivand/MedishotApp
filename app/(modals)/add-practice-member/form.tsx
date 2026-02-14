import { AvatarIcon, PlusIcon } from "@/assets/icons";
import { BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper, KeyboardAwareScrollView } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicFieldItem, DynamicInputConfig } from "@/models";
import { AddressLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { spacing } from "@/styles/spaces";
import themeColors, { colors } from "@/theme/colors";
import { toE164 } from "@/utils/helper/phoneUtils";
import { useAddMember, useGetSubscriptionStatus, useTempUpload, useUpdateMemberRole } from "@/utils/hook";
import { AddMemberDto, UpdateMemberRoleDto } from "@/utils/service/models/RequestModels";
import { TempUploadResponse } from "@/utils/service/models/ResponseModels";
import { Host, Picker } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

interface MetadataObject {
    phones?: Array<{ label: string; value: string }>;
    emails?: Array<{ label: string; value: string }>;
    addresses?: Array<{ label: string; value: string | DynamicFieldItem["value"] }>;
    urls?: Array<{ label: string; value: string }>;
}

interface FileUpload {
    uri: string;
    type: string;
    name: string;
}

type AddressValue = {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

interface AddMemberFormData {
    first_name: string;
    last_name: string;
    email: string;
    birth_date?: string;
    gender?: string;
    role: "staff" | "doctor";
}

const roleOptions = [
    { label: "Staff", value: "staff" as const },
    { label: "Doctor", value: "doctor" as const },
];

// Dynamic input configs
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

const urlConfig: DynamicInputConfig = {
    fieldType: DynamicFieldType.URL,
    fieldTitle: "URL",
    labelOptions: [URLLabel.Instagram, URLLabel.Facebook, URLLabel.Twitter, URLLabel.LinkedIn, URLLabel.YouTube, URLLabel.TikTok, URLLabel.Telegram, URLLabel.WhatsApp, URLLabel.Other],
    placeholder: "Enter URL",
};

export default function AddPracticeMemberForm() {
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ practiceId: string; member?: string; mode?: string }>();
    const practiceId = params.practiceId;
    const mode = params.mode || "create";
    const isEditMode = mode === "edit";

    // Parse member data if in edit mode
    const memberData = React.useMemo(() => {
        if (isEditMode && params.member) {
            try {
                return JSON.parse(params.member);
            } catch {
                return null;
            }
        }
        return null;
    }, [isEditMode, params.member]);
    const queryClient = useQueryClient();
    const { mutate: addMember, isPending: isAddingMember } = useAddMember(
        (data) => {
            router.back();
            queryClient.invalidateQueries({ queryKey: ["GetPracticeMembers"] });
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to add member. Please try again.");
        },
    );

    const { mutate: updateMemberRole, isPending: isUpdatingRole } = useUpdateMemberRole(
        () => {
            router.back();
        },
        (error) => {
            Alert.alert("Error", error?.message || "Failed to update member role. Please try again.");
        },
    );

    const [localImageUri, setLocalImageUri] = useState<string | null>(null); // Local URI for preview
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null); // Filename from server for submit
    const uploadedFilenameRef = useRef<string | null>(null); // Ref to always have latest value
    const insets = useSafeAreaInsets();
    const [selectedRoleIndex, setSelectedRoleIndex] = React.useState(0);

    // States for dynamic inputs
    const [phones, setPhones] = useState<DynamicFieldItem[]>([]);
    const phonesRef = useRef<DynamicFieldItem[]>([]);
    const [emails, setEmails] = useState<DynamicFieldItem[]>([]);
    const [addresses, setAddresses] = useState<DynamicFieldItem[]>([]);
    const addressesRef = useRef<DynamicFieldItem[]>([]);
    const [urls, setUrls] = useState<DynamicFieldItem[]>([]);

    // Error states for dynamic fields
    const [phoneError, setPhoneError] = useState<string>("");
    const [addressError, setAddressError] = useState<string>("");

    const { mutate: uploadImage, isPending: isUploading } = useTempUpload(
        (response: TempUploadResponse) => {
            // Handle both wrapped and unwrapped response structures
            const filename = (response as { data?: { filename?: string }; filename?: string }).data?.filename ?? response.filename ?? null;
            setUploadedFilename(filename); // Only save filename for submit, keep local URI for preview
            uploadedFilenameRef.current = filename; // Also update ref to always have latest value
        },
        (error) => {
            setLocalImageUri(null);
            setUploadedFilename(null);
        },
    );

    const { data: subscriptionData } = useGetSubscriptionStatus(Number(practiceId || 0), !!practiceId);
    const limits = subscriptionData?.data?.limits;
    const doctorLimit = limits?.doctor_limit ?? null;
    const staffLimit = limits?.staff_limit ?? null;
    const remainingDoctorSlots = typeof limits?.remaining_doctor_slots === "number" ? limits.remaining_doctor_slots : null;
    const remainingStaffSlots = typeof limits?.remaining_staff_slots === "number" ? limits.remaining_staff_slots : null;

    // Owner counts as 1 doctor: when doctor_limit === 1, that slot is the owner — cannot add another doctor
    const canAddDoctor = doctorLimit === null || (doctorLimit !== 1 && remainingDoctorSlots !== null && remainingDoctorSlots > 0);
    const canAddStaff = staffLimit === null || (remainingStaffSlots !== null && remainingStaffSlots > 0);

    const filteredRoleOptions = useMemo(() => {
        if (!canAddDoctor && !canAddStaff) return roleOptions;
        if (canAddDoctor && !canAddStaff) return roleOptions.filter((o) => o.value === "doctor");
        if (!canAddDoctor && canAddStaff) return roleOptions.filter((o) => o.value === "staff");
        return roleOptions;
    }, [canAddDoctor, canAddStaff]);

    const effectiveDefaultRole = (filteredRoleOptions[0]?.value ?? "staff") as "staff" | "doctor";

    const {
        control,
        handleSubmit,
        watch,
        trigger,
        formState: { errors },
        setValue,
        getValues,
        reset,
    } = useForm<AddMemberFormData>({
        resolver: zodResolver(
            z.object({
                first_name: z.string().min(1, "First name is required"),
                last_name: z.string().min(1, "Last name is required"),
                email: z.string().email("Please enter a valid email address"),
                birth_date: z.string().optional(),
                gender: z.string().optional(),
                role: z.enum(["staff", "doctor"]),
            }),
        ),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            birth_date: "",
            gender: "",
            role: "staff",
        },
    });

    const firstName = watch("first_name");
    const lastName = watch("last_name");

    // Validation: create mode requires at least 1 phone; email is required in form fields above
    const hasValidPhone = useMemo(() => {
        return phones.some((phone) => {
            if (!phone?.value) return false;
            const valueStr = String(phone.value).trim();
            if (valueStr === "" || valueStr === "+1") return false;
            return !!toE164(valueStr);
        });
    }, [phones]);

    const hasValidAddress = useMemo(() => {
        return addresses.some((address) => {
            if (!address.value) return false;
            if (typeof address.value === "object") {
                const addr = address.value as AddressValue;
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
        // Create mode: require at least one phone and one address; email is required by form
        return baseValid && hasValidPhone && hasValidAddress;
    }, [firstName, lastName, isEditMode, hasValidPhone, hasValidAddress]);

    // Set form values when member data is available (edit mode)
    React.useEffect(() => {
        if (isEditMode && memberData && filteredRoleOptions.length > 0) {
            const memberRole = (memberData.role === "member" ? "staff" : memberData.role === "doctor" ? "doctor" : "staff") as "staff" | "doctor";
            const effectiveRole = filteredRoleOptions.some((o) => o.value === memberRole) ? memberRole : effectiveDefaultRole;
            reset({
                first_name: memberData.first_name || "",
                last_name: memberData.last_name || "",
                email: memberData.email || "",
                birth_date: memberData.birth_date || "",
                gender: memberData.gender ? memberData.gender.toLowerCase() : "",
                role: effectiveRole,
            });
            const roleIndex = filteredRoleOptions.findIndex((o) => o.value === effectiveRole);
            setSelectedRoleIndex(roleIndex !== -1 ? roleIndex : 0);
        }
    }, [isEditMode, memberData, reset, filteredRoleOptions, effectiveDefaultRole]);

    // Initialize uploadedFilename with existing image URL if in edit mode
    useEffect(() => {
        if (isEditMode && memberData?.image?.url && !localImageUri) {
            setUploadedFilename(memberData.image.url);
            uploadedFilenameRef.current = memberData.image.url;
        }
    }, [isEditMode, memberData?.image?.url, localImageUri]);

    const handleImageSelected = async (result: { uri: string; base64?: string | null }) => {
        setLocalImageUri(result.uri); // Save local URI for preview

        try {
            const filename = result.uri.split("/").pop() || "image.jpg";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            const file: FileUpload = {
                uri: result.uri,
                type: type,
                name: filename,
            };

            uploadImage(file);
        } catch (error) {}
    };

    const onSubmit = React.useCallback(
        (data: AddMemberFormData) => {
            if (isEditMode && memberData) {
                // Update member role only - backend only accepts "staff" or "doctor"
                const roleUpdate: UpdateMemberRoleDto = { role: data.role };
                updateMemberRole({
                    practiceId: parseInt(practiceId),
                    memberId: memberData.id,
                    data: roleUpdate,
                });
            } else {
                // Add new member
                // Map DynamicFieldItem arrays to the format expected by API and include in metadata
                const phonesData = phones.length > 0 ? phones.map((phone) => ({ label: phone.label, value: typeof phone.value === "string" ? phone.value : "" })) : undefined;
                const emailsData = emails.length > 0 ? emails.map((email) => ({ label: email.label, value: typeof email.value === "string" ? email.value : "" })) : undefined;
                const addressesData = addresses.length > 0 ? addresses.map((address) => ({ label: address.label, value: address.value })) : undefined;
                const urlsData = urls.length > 0 ? urls.map((url) => ({ label: url.label, value: typeof url.value === "string" ? url.value : "" })) : undefined;

                // Build metadata object
                const metadataObject: MetadataObject = {};
                if (phonesData) metadataObject.phones = phonesData;
                if (emailsData) metadataObject.emails = emailsData;
                if (addressesData) metadataObject.addresses = addressesData;
                if (urlsData) metadataObject.urls = urlsData;

                // Only submit filename from server, not local URI
                // Use ref to always get the latest value (avoid closure issues)
                const currentUploadedFilename = uploadedFilenameRef.current || uploadedFilename;

                const memberData: AddMemberDto = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email,
                    role: data.role,
                    ...(data.birth_date && { birth_date: data.birth_date }),
                    ...(data.gender && { gender: data.gender.toLowerCase() as "male" | "female" | "other" }),
                    ...(Object.keys(metadataObject).length > 0 && { metadata: JSON.stringify(metadataObject) }),
                    ...(currentUploadedFilename && { profile_photo: currentUploadedFilename }),
                };

                addMember({
                    practiceId: parseInt(practiceId),
                    data: memberData,
                });
            }
        },
        [isEditMode, memberData, updateMemberRole, addMember, practiceId, phones, emails, addresses, urls, uploadedFilename],
    );

    const handleSubmitWithValidation = React.useCallback(async () => {
        // Create mode: validate all required fields (first name, last name, email, phone, address) so errors show under the fields
        if (!isEditMode) {
            const values = getValues();
            const firstNameVal = (values.first_name ?? "").trim();
            const lastNameVal = (values.last_name ?? "").trim();
            const emailVal = (values.email ?? "").trim();
            const hasFirstName = firstNameVal !== "";
            const hasLastName = lastNameVal !== "";
            const hasValidEmail = emailVal !== "" && emailVal.includes("@");

            const currentPhones = phonesRef.current;
            const currentAddresses = addressesRef.current;
            const hasPhone = currentPhones.some((p) => {
                if (!p?.value) return false;
                const valueStr = String(p.value).trim();
                if (valueStr === "" || valueStr === "+1") return false;
                return !!toE164(valueStr);
            });
            const hasAddress = currentAddresses.some((a) => {
                if (!a?.value) return false;
                if (typeof a.value === "object") {
                    const addr = a.value as AddressValue;
                    return (addr.street1?.trim() || "") !== "" || (addr.city?.trim() || "") !== "";
                }
                return typeof a.value === "string" && a.value.trim() !== "";
            });

            const missing: string[] = [];
            if (!hasFirstName) missing.push("First Name");
            if (!hasLastName) missing.push("Last Name");
            if (!hasValidEmail) missing.push("Email Address");
            if (!hasPhone) missing.push("at least one valid phone number");
            if (!hasAddress) missing.push("at least one address (street or city)");

            if (missing.length > 0) {
                // Run form validation so errors show under First Name / Last Name / Email
                await trigger(["first_name", "last_name", "email"]);
                if (!hasPhone) setPhoneError("At least one valid phone number is required");
                else setPhoneError("");
                if (!hasAddress) setAddressError("At least one address with street or city is required");
                else setAddressError("");
                Alert.alert("Required Fields", `Please fill in all required fields: ${missing.join(", ")}.`);
                return;
            }

            setPhoneError("");
            setAddressError("");
        }

        // Then validate form fields (zod) and submit
        handleSubmit(onSubmit)();
    }, [isEditMode, getValues, trigger, handleSubmit, onSubmit]);

    useEffect(() => {
        if (isEditMode || filteredRoleOptions.length === 0) return;
        const currentRole = getValues("role");
        const allowed = filteredRoleOptions.some((o) => o.value === currentRole);
        if (allowed) return;
        setValue("role", effectiveDefaultRole, { shouldValidate: true });
        setSelectedRoleIndex(0);
    }, [isEditMode, filteredRoleOptions, effectiveDefaultRole, setValue, getValues]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable onPress={handleSubmitWithValidation} disabled={isAddingMember || isUpdatingRole} className="px-2">
                    {isAddingMember || isUpdatingRole ? (
                        <ActivityIndicator size="small" color={colors.system.blue} />
                    ) : (
                        <BaseText type="Body" weight="600" color={isAddingMember || isUpdatingRole ? "system.gray" : "system.blue"}>
                            Done
                        </BaseText>
                    )}
                </Pressable>
            ),
            // <BaseButton label="Done" onPress={handleSubmit(onSubmit)} disabled={isAddingMember || isUpdatingRole} ButtonStyle="Filled" size="Medium" />,
        });
    }, [navigation, handleSubmitWithValidation, isAddingMember, isUpdatingRole, isEditMode]);

    return (
        <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40, gap: 24 }}>
            <View style={styles.avatarContainer}>
                <ImagePickerWrapper onImageSelected={handleImageSelected} disabled={isEditMode}>
                    <View style={styles.avatarWrapper}>
                        {isUploading ? (
                            // Show loading indicator while uploading
                            <ActivityIndicator size="small" color={themeColors.system.gray6} />
                        ) : localImageUri ? (
                            // Show preview after upload is complete (new image)
                            <Image source={{ uri: localImageUri }} style={styles.avatarImage} />
                        ) : memberData?.image?.url ? (
                            // Show existing image from server
                            <Image source={{ uri: memberData.image.url }} style={styles.avatarImage} />
                        ) : (
                            // Show default avatar when no image
                            <AvatarIcon width={50} height={50} strokeWidth={0} />
                        )}
                        {!isEditMode && (
                            <View style={styles.plusButton}>
                                {isUploading ? (
                                    <ActivityIndicator size="small" color={themeColors.system.white} />
                                ) : localImageUri || memberData?.image?.url ? (
                                    <IconSymbol name="pencil" size={14} color={themeColors.system.white} />
                                ) : (
                                    <PlusIcon width={14} height={14} strokeWidth={0} />
                                )}
                            </View>
                        )}
                    </View>
                </ImagePickerWrapper>
                <View style={styles.titleContainer}>
                    <BaseText type="Title1" weight="700" color="system.black">
                        {isEditMode ? "Update Member Role" : "Add Member"}
                    </BaseText>
                    <BaseText type="Body" color="labels.secondary" align="center">
                        {isEditMode ? "Update the role for this member." : "Add a new member to your practice."}
                    </BaseText>
                </View>
            </View>

            <View className="gap-4">
                <View className="bg-white rounded-2xl px-4">
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="first_name" label="First Name" haveBorder={false} error={errors.first_name?.message} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="last_name" label="Last Name" haveBorder={false} error={errors.last_name?.message} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledInput control={control} name="email" label="Email Address" haveBorder={false} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="birth_date" label="Birth Date" type="date" error={errors.birth_date?.message} noBorder={true} disabled={isEditMode} />
                    </View>
                    <View className="border-b border-border">
                        <ControlledPickerInput control={control} name="gender" label="Gender" type="gender" error={errors.gender?.message} noBorder={true} disabled={isEditMode} />
                    </View>
                    <View className="py-3">
                        <View className="gap-2 flex-row items-center justify-between pl-5">
                            <BaseText type="Body" weight="400" color="labels.primary">
                                Role:
                            </BaseText>
                            <Host style={{ height: 40, width: "40%" }}>
                                <Controller
                                    control={control}
                                    name="role"
                                    render={({ field: { onChange, value } }) => {
                                        const currentIndex = filteredRoleOptions.findIndex((opt) => opt.value === value);
                                        const syncIndex = currentIndex !== -1 ? currentIndex : selectedRoleIndex;

                                        return (
                                            <Picker
                                                label="Select role"
                                                selectedIndex={syncIndex}
                                                variant="menu"
                                                onOptionSelected={({ nativeEvent: { index } }) => {
                                                    const roleValue = filteredRoleOptions[index]?.value ?? effectiveDefaultRole;
                                                    setSelectedRoleIndex(index);
                                                    onChange(roleValue);
                                                    setValue("role", roleValue, { shouldValidate: true });
                                                }}
                                                options={filteredRoleOptions.map((o) => o.label)}
                                            />
                                        );
                                    }}
                                />
                            </Host>
                        </View>
                        {errors.role?.message && (
                            <BaseText type="Caption1" weight="400" color="system.red" className="pl-4 mt-1">
                                {errors.role.message}
                            </BaseText>
                        )}
                    </View>
                </View>
                {!isEditMode && (
                    <View className="gap-4">
                        <DynamicInputList
                            config={phoneConfig}
                            paramKey="phone"
                            onChange={(items) => {
                                setPhones(items);
                                phonesRef.current = items;
                                // Only clear error when at least one valid phone exists
                                const hasValid = items.some((p) => {
                                    if (!p?.value) return false;
                                    const valueStr = String(p.value).trim();
                                    if (valueStr === "" || valueStr === "+1") return false;
                                    return !!toE164(valueStr);
                                });
                                if (hasValid) setPhoneError("");
                            }}
                            initialItems={phones}
                            error={phoneError}
                        />
                        {/* <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} initialItems={emails} /> */}
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
                        <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} initialItems={urls} />
                    </View>
                )}
            </View>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing["6"],
    },
    avatarContainer: {
        alignItems: "center",
    },
    avatarWrapper: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: themeColors.system.gray2,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        borderRadius: 45,
    },
    plusButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: themeColors.system.blue,
        borderRadius: 999,
        padding: spacing["1"],
        borderWidth: 1,
        borderColor: themeColors.system.white,
    },
    titleContainer: {
        marginTop: spacing["4"],
        alignItems: "center",
    },
});
