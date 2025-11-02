import { AvatarIcon } from "@/assets/icons";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicInputConfig } from "@/models";
import { AddressLabel, DateLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { useCreatePatient, useGetPatientById, useTempUpload, useUpdatePatient } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image, Pressable, View } from "react-native";
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const safeAreaInsets = useSafeAreaInsets();
    const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
    const [hasUploadedScannedImage, setHasUploadedScannedImage] = useState(false);
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
            setUploadedFilename(response.filename);
            setSelectedImage(response.filename); // Update selected image with uploaded filename
            console.log("Image uploaded successfully:", response.filename);
        },
        (error) => {
            console.error("Error uploading image:", error.message);
        },
    );

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
                // Convert "Male"/"Female" to lowercase for form
                const genderValue = params.gender.toLowerCase();
                setValue("gender", genderValue === "male" ? "Male" : genderValue === "female" ? "Female" : params.gender);
            }

            // Set scanned image if available
            if (params.scannedImageUri && !hasUploadedScannedImage) {
                setSelectedImage(params.scannedImageUri);
                // Upload the scanned image automatically
                try {
                    const filename = params.scannedImageUri.split("/").pop() || "scanned-id.jpg";
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : "image/jpeg";

                    const file = {
                        uri: params.scannedImageUri,
                        type,
                        name: filename,
                    } as any;

                    // Upload the scanned image
                    uploadImage(file);
                    setHasUploadedScannedImage(true);
                } catch (err) {
                    console.log("Error preparing scanned image:", err);
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
                        value: params.address,
                    },
                ]);
            }
        }
    }, [params, isEditMode, setValue, uploadImage, hasUploadedScannedImage]);

    useEffect(() => {
        if (patient?.data && isEditMode) {
            const patientData = patient.data;
            setValue("first_name", patientData.first_name || "");
            setValue("last_name", patientData.last_name || "");
            setValue("birth_date", patientData.birth_date || "");
            setValue("gender", patientData.gender || "");

            if (patientData.profile_image?.url) {
                setSelectedImage(patientData.profile_image.url);
            }

            if (patientData?.numbers && patientData?.numbers?.length > 0) {
                const phoneData = patientData.numbers.map((phone: any, index: number) => ({
                    id: `phone-${index}`,
                    label: phone.type,
                    value: phone.value,
                }));
                setPhones(phoneData);
            }

            if (patientData?.email && patientData?.email?.length > 0) {
                const emailData = patientData.email.map((email: any, index: number) => ({
                    id: `email-${index}`,
                    label: "Personal",
                    value: email,
                }));
                setEmails(emailData);
            }

            if (patientData?.addresses && patientData?.addresses?.length > 0) {
                const addressData = patientData.addresses.map((address: any, index: number) => ({
                    id: `address-${index}`,
                    label: "Home",
                    value: typeof address === "string" ? address : address,
                }));
                setAddresses(addressData);
            }

            if (patientData?.links && patientData?.links?.length > 0) {
                const linkData = patientData.links.map((link: any, index: number) => ({
                    id: `link-${index}`,
                    label: "Other",
                    value: typeof link === "string" ? link : link,
                }));
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
                              street: address.value as string,
                              city: "",
                              state: "",
                              zip: "",
                              country: "",
                          },
            }));

        const urlLinks = urls
            .filter((url) => url.value && url.value.trim() !== "")
            .map((url) => ({
                type: url.label,
                value: url.value,
            }));

        const patientData = {
            first_name: data.first_name,
            last_name: data.last_name,
            birth_date: data.birth_date,
            gender: data.gender.toLowerCase() as "male" | "female" | "other",
            numbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
            email: emailAddresses.length > 0 ? emailAddresses[0].value : undefined,
            addresses: addressList.length > 0 ? addressList : undefined,
            links: urlLinks.length > 0 ? urlLinks : undefined,
            image: selectedImage || undefined,
        };

        console.log("Final patient data to submit:", patientData);

        if (isEditMode && params.id) {
            console.log("Updating patient:", patientData);

            updatePatient(
                { patientId: params.id, data: patientData },
                {
                    onSuccess: (response) => {
                        console.log("Patient updated successfully:", response);
                        router.push(`/patients/${params.id}`);
                    },
                    onError: (error) => {
                        console.error("Error updating patient:", error);
                    },
                },
            );
        } else {
            console.log("===============createPatient IS CAlling=====================");

            createPatient(patientData, {
                onSuccess: (response) => {
                    console.log("Patient created successfully:", response);
                    router.push("/(tabs)/patients");
                    router.back();
                },
                onError: (error) => {
                    console.error("Error creating patient:", error);
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
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            alert("Permission to access gallery is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: false,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setSelectedImage(uri);

            try {
                const filename = uri.split("/").pop() || "image.jpg";
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : "image/jpeg";

                const file = {
                    uri,
                    type,
                    name: filename,
                } as any;

                uploadImage(file); // ✅ همین کاری که تو CreatePractice کردی
            } catch (err) {
                console.log("upload error", err);
            }
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            alert("Permission to access camera is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            base64: false,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setSelectedImage(uri);

            try {
                const filename = uri.split("/").pop() || "image.jpg";
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : "image/jpeg";

                const file = {
                    uri,
                    type,
                    name: filename,
                } as any;

                uploadImage(file); // ✅ همین
            } catch (err) {
                console.log("upload error", err);
            }
        }
    };
    return (
        <ScrollView className="flex-1 bg-system-gray6" contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 10, paddingTop: safeAreaInsets.top + 10 }}>
            <View className="flex-1 bg-system-gray6 gap-8">
                <View className="items-center justify-center gap-5">
                    <View className="gap-4 ">
                        <View className="w-32 h-32 rounded-full bg-system-gray2 items-center justify-center">{selectedImage ? <Image source={{ uri: selectedImage }} className="w-full h-full rounded-full" /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}</View>
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
                    <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} initialItems={phones} />
                    <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} initialItems={emails} />
                    <DynamicInputList config={addressConfig} paramKey="address" onChange={setAddresses} initialItems={addresses} />
                    <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} initialItems={urls} />
                </View>
            </View>
        </ScrollView>
    );
};
