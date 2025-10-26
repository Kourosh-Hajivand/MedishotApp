import { AvatarIcon } from "@/assets/icons";
import { ControlledPickerInput } from "@/components/input/ControlledPickerInput";
import { DynamicInputConfig } from "@/models";
import { AddressLabel, DateLabel, DynamicFieldType, EmailLabel, PhoneLabel, URLLabel } from "@/models/enums";
import { useCreatePatient, useGetPatientById } from "@/utils/hook";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image, Pressable, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { BaseButton, BaseText, ControlledInput, DynamicInputList, ImagePickerWrapper } from "../components";
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
    const params = useLocalSearchParams<{ id?: string }>();
    const { data: patient } = useGetPatientById(params.id ?? "");
    console.log("Patient:", patient);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const safeAreaInsets = useSafeAreaInsets();

    // States for dynamic inputs
    const [phones, setPhones] = useState<any[]>([]);
    const [emails, setEmails] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [urls, setUrls] = useState<any[]>([]);

    const handleTakePhoto = () => {
        console.log("Take photo");
    };

    const handleSelectFromGallery = () => {
        console.log("Select from gallery");
    };

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
    const { mutate: createPatient, isPending } = useCreatePatient(selectedPractice?.id ?? "");
    const onSubmit = (data: FormData) => {
        console.log("Form submitted with data:", data);
        console.log("Selected image:", selectedImage);
        console.log("Phones:", phones);
        console.log("Emails:", emails);
        console.log("Addresses:", addresses);
        console.log("URLs:", urls);

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

    return (
        <ScrollView className="flex-1 bg-system-gray6" contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 10, paddingTop: safeAreaInsets.top + 10 }}>
            <View className="flex-1 bg-system-gray6 gap-8">
                <View className="items-center justify-center gap-5">
                    <ImagePickerWrapper
                        onImageSelected={(result) => {
                            const imageUri = result.uri || (result.base64 ? `data:image/jpeg;base64,${result.base64}` : null);
                            setSelectedImage(imageUri);
                            console.log("Image selected:", { uri: result.uri, hasBase64: !!result.base64 });
                        }}
                    >
                        <View className="gap-4">
                            <View className="w-32 h-32 rounded-full bg-system-gray2 items-center justify-center">{selectedImage ? <Image source={{ uri: selectedImage }} className="w-full h-full rounded-full" /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}</View>
                            <BaseButton label="Pick a Photo" ButtonStyle="Tinted" size="Small" rounded onPress={handleSelectFromGallery} />
                        </View>
                    </ImagePickerWrapper>
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
                    <DynamicInputList config={phoneConfig} paramKey="phone" onChange={setPhones} />
                    <DynamicInputList config={emailConfig} paramKey="email" onChange={setEmails} />
                    <DynamicInputList config={addressConfig} paramKey="address" onChange={setAddresses} />
                    <DynamicInputList config={urlConfig} paramKey="url" onChange={setUrls} />
                </View>
            </View>
        </ScrollView>
    );
};
