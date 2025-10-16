import { AvatarIcon } from "@/assets/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Image, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { BaseButton, BaseText, ControlledInput, ImagePickerWrapper } from "../components";

const schema = z.object({
    first_name: z.string().min(1, "First Name is required"),
    last_name: z.string().min(1, "Last Name is required"),
    birth_date: z.string().min(1, "Birth Date is required"),
    gender: z.string().min(1, "Gender is required"),
});

type FormData = z.infer<typeof schema>;

export const AddPatientPhotoScreen: React.FC = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ patientData?: string }>();
    const patientData = params.patientData ? JSON.parse(params.patientData as string) : undefined;
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const safeAreaInsets = useSafeAreaInsets();
    const handleTakePhoto = () => {
        console.log("Take photo");
    };

    const handleSelectFromGallery = () => {
        console.log("Select from gallery");
    };

    const handleNext = () => {
        router.push({ pathname: "/(modals)/add-patient/review", params: { patientData: JSON.stringify(patientData ?? {}), photoUri: selectedImage || "" } });
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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleNext} disabled={!selectedImage} className="px-2">
                    <BaseText type="Body" weight="600" color={selectedImage ? "system.blue" : "system.gray"}>
                        Done
                    </BaseText>
                </TouchableOpacity>
            ),
        });
    }, [navigation, selectedImage, patientData]);

    return (
        <View className="flex-1 bg-system-gray6 gap-8" style={{ paddingTop: safeAreaInsets.top + 10 }}>
            <View className="items-center justify-center gap-5">
                <ImagePickerWrapper onImageSelected={(result) => setSelectedImage(result.uri ?? (result.base64 ? `data:image/jpeg;base64,${result.base64}` : null))}>
                    <View className="gap-4">
                        <View className="w-32 h-32 rounded-full bg-system-gray2 items-center justify-center">{selectedImage ? <Image source={{ uri: selectedImage }} className="w-full h-full rounded-full" /> : <AvatarIcon width={50} height={50} strokeWidth={0} />}</View>
                        <BaseButton label="Pick a Photo" ButtonStyle="Tinted" size="Small" rounded onPress={handleSelectFromGallery} />
                    </View>
                </ImagePickerWrapper>
            </View>

            <View className="px-4">
                <View className="bg-white rounded-2xl  px-6">
                    {[
                        { name: "first_name", label: "First Name" },
                        { name: "last_name", label: "Last Name" },
                        { name: "birth_date", label: "Birth Date" },
                        { name: "gender", label: "Gender" },
                    ].map((f, index) => {
                        return (
                            <View key={f.name} className={`${index === 3 ? "border-b-0" : "border-b"}`}>
                                <ControlledInput control={control} name={f.name as keyof FormData} label={f.label} haveBorder={false} error={errors?.[f.name as keyof FormData]?.message as string} />
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};
