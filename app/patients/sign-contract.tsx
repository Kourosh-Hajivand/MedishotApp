import { BaseButton, BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { useCreateContract, useGetContractTemplate, useGetPatientById, useGetPracticeById, useTempUpload } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SignatureCanvas, { SignatureViewRef } from "react-native-signature-canvas";

interface PracticeSettings {
    avatar: "profile_picture" | "logo";
    practiceName: boolean;
    doctorName: boolean;
    address: boolean;
    practicePhone: boolean;
    practiceURL: boolean;
    practiceEmail: boolean;
    practiceSocialMedia: boolean;
}

const defaultPracticeSettings: PracticeSettings = {
    avatar: "profile_picture",
    practiceName: true,
    doctorName: true,
    address: true,
    practicePhone: true,
    practiceURL: false,
    practiceEmail: false,
    practiceSocialMedia: false,
};

export default function SignContractScreen() {
    const { patientId, templateId } = useLocalSearchParams<{ patientId: string; templateId: string }>();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { selectedPractice } = useProfileStore();
    const { profile: me } = useAuth();

    const { data: contractTemplate, isLoading: isLoadingTemplate } = useGetContractTemplate(templateId || "", !!templateId);
    const { data: patientData, isLoading: isLoadingPatient } = useGetPatientById(patientId || "");
    const { data: practiceData, isLoading: isLoadingPractice } = useGetPracticeById(selectedPractice?.id || 0, !!selectedPractice?.id);

    console.log("=============== patientData?.data=====================");
    console.log(patientData?.data);
    console.log("====================================");

    const [signature, setSignature] = useState<string | null>(null);
    const [signatureUri, setSignatureUri] = useState<string | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [uploadedSignatureFilename, setUploadedSignatureFilename] = useState<string | null>(null);

    const { mutate: uploadSignature, isPending: isUploadingSignature } = useTempUpload(
        (response) => {
            const filename = (response as any)?.filename || response.filename || null;
            setUploadedSignatureFilename(filename);
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to upload signature");
        },
    );

    const { mutate: createContract, isPending: isSubmitting } = useCreateContract(
        () => {
            Alert.alert("Success", "Contract signed successfully!", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to sign contract");
        },
    );

    // Parse metadata
    const metadata = useMemo(() => {
        if (!practiceData?.data?.metadata) return null;
        if (typeof practiceData.data.metadata === "string") {
            try {
                return JSON.parse(practiceData.data.metadata);
            } catch {
                return null;
            }
        }
        return practiceData.data.metadata;
    }, [practiceData?.data?.metadata]);

    // Get print settings from metadata
    const printSettings: PracticeSettings = useMemo(() => {
        return metadata?.print_settings || defaultPracticeSettings;
    }, [metadata]);

    const handleSubmit = useCallback(() => {
        if (!signature || !uploadedSignatureFilename) {
            Alert.alert("Error", "Please sign the contract first");
            return;
        }

        createContract({
            patientId: patientId || "",
            data: {
                contract_template_id: Number(templateId),
                signature_image: uploadedSignatureFilename,
            },
        });
    }, [signature, uploadedSignatureFilename, patientId, templateId, createContract]);

    // Setup header with patient info and Done button - MUST be before early returns
    const patient = patientData?.data;
    useLayoutEffect(() => {
        if (!patient) {
            // Set default header when patient is not loaded
            navigation.setOptions({
                headerTitle: "",
                headerTitleAlign: "center",

                headerRight: () => (
                    <TouchableOpacity onPress={handleSubmit} disabled={!signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature} className="px-4 py-2">
                        <BaseText type="Body" color={!signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature ? "labels.tertiary" : "system.blue"} weight={600}>
                            Done
                        </BaseText>
                    </TouchableOpacity>
                ),
            });
            return;
        }

        const patientName = `${patient.first_name} ${patient.last_name}`;
        const patientImageUrl = patient.profile_image?.url;
        const photoDate = patient.profile_image?.created_at ? new Date(patient.profile_image.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : patient.created_at ? new Date(patient.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

        navigation.setOptions({
            headerTitle: () => (
                <View className="flex-row items-center gap-1  max-w-[200px]">
                    <Avatar name={patientName} haveRing color={patient.doctor?.color} size={42} />
                    <View className="gap-0.5">
                        <BaseText type="Subhead" weight={600} color="labels.primary" numberOfLines={1}>
                            {patientName}
                        </BaseText>
                        {photoDate && (
                            <BaseText type="Caption2" color="labels.secondary" numberOfLines={1}>
                                {photoDate}
                            </BaseText>
                        )}
                    </View>
                </View>
            ),
            headerTitleAlign: "center",
            // headerLeft: () => <BackButton noText onPress={() => router.back()} />,
            headerRight: () => (
                <TouchableOpacity onPress={handleSubmit} disabled={!signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature} className="px-2 py-2">
                    <BaseText type="Body" color={!signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature ? "labels.tertiary" : "system.blue"} weight={600}>
                        Done
                    </BaseText>
                </TouchableOpacity>
            ),
        });
    }, [patient, signature, uploadedSignatureFilename, isSubmitting, isUploadingSignature, navigation, handleSubmit]);

    const isLoading = isLoadingTemplate || isLoadingPatient || isLoadingPractice;

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    const practice = practiceData?.data;
    const template = contractTemplate?.data;

    if (!patient || !practice || !template) {
        return (
            <View className="flex-1 items-center justify-center">
                <BaseText type="Body" color="labels.secondary">
                    Data not found
                </BaseText>
            </View>
        );
    }

    const handleSignature = async (base64: string, uri?: string) => {
        setSignature(base64);
        if (uri) {
            setSignatureUri(uri);
            // Upload signature to temp storage
            try {
                // react-native-signature-canvas returns PNG
                const filename = `signature_${Date.now()}.png`;
                const file = {
                    uri: uri,
                    type: "image/png",
                    name: filename,
                } as any;

                uploadSignature(file);
            } catch (error) {
                console.error("Error preparing signature for upload:", error);
                Alert.alert("Error", "Failed to prepare signature for upload");
            }
        } else if (base64) {
            // If we only have base64, create a data URI
            const dataUri = `data:image/png;base64,${base64}`;
            setSignatureUri(dataUri);
            // Create file object from base64 for upload
            try {
                const filename = `signature_${Date.now()}.png`;
                const file = {
                    uri: dataUri,
                    type: "image/png",
                    name: filename,
                } as any;
                uploadSignature(file);
            } catch (error) {
                console.error("Error preparing signature for upload:", error);
                Alert.alert("Error", "Failed to prepare signature for upload");
            }
        }
        setShowSignatureModal(false);
    };

    // Helper function to replace placeholders in text
    const replacePlaceholders = (text: string): string => {
        if (!patient || !practice) return text;
        return text
            .replace(/#name#/g, `${patient.first_name} ${patient.last_name}`)
            .replace(/#practise#/g, practice.name || "")
            .replace(/\{patient_name\}/g, `${patient.first_name} ${patient.last_name}`)
            .replace(/\{practice_name\}/g, practice.name || "")
            .replace(/\{doctor_name\}/g, patient.doctor ? `Dr. ${patient.doctor.first_name} ${patient.doctor.last_name}` : "")
            .replace(/\{date\}/g, new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
    };

    // Helper function to strip HTML tags and convert to plain text
    const stripHtml = (html: string): string => {
        return html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<p[^>]*>/gi, "")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .trim();
    };

    return (
        <View className="flex-1" style={{ paddingTop: headerHeight }}>
            <ScrollView className="flex-1 px-5 py-5 " contentContainerStyle={{ paddingBottom: insets.bottom + 20, gap: 28 }}>
                {/* Header with Practice Info - Based on print_settings */}
                <View className="flex-row items-center justify-between ">
                    <View className="flex-row items-center gap-2">
                        {printSettings.avatar === "logo" && practice.image?.url ? (
                            <Image source={{ uri: practice.image.url }} className="w-10 h-10 rounded-full" />
                        ) : printSettings.avatar === "profile_picture" && patient.doctor?.profile_photo_url ? (
                            <Avatar name={`${me?.first_name} ${me?.last_name}`} size={40} imageUrl={me?.profile_photo_url || undefined} />
                        ) : null}
                        <View className="gap-0">
                            {printSettings.practiceName && (
                                <BaseText type="Subhead" weight={600} color="labels.primary">
                                    {practice.name}
                                </BaseText>
                            )}
                            {printSettings.doctorName && patient.doctor && (
                                <BaseText type="Caption2" color="labels.secondary">
                                    Dr. {patient.doctor.first_name} {patient.doctor.last_name}
                                </BaseText>
                            )}
                            {/* {printSettings.address && metadata?.address && (
                                <BaseText type="Caption2" color="labels.secondary">
                                    {metadata.address}
                                </BaseText>
                            )} */}
                            {/* {printSettings.practicePhone && metadata?.phone && (
                                <BaseText type="Caption2" color="labels.secondary">
                                    {metadata.phone}
                                </BaseText>
                            )} */}
                            {/* {printSettings.practiceEmail && metadata?.email && (
                                <BaseText type="Caption2" color="labels.secondary">
                                    {metadata.email}
                                </BaseText>
                            )}
                            {printSettings.practiceURL && metadata?.website && (
                                <BaseText type="Caption2" color="labels.secondary">
                                    {metadata.website}
                                </BaseText>
                            )} */}
                        </View>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <BaseText type="Caption1" color="system.black">
                            Date:
                        </BaseText>
                        <BaseText type="Caption1" color="system.blue">
                            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </BaseText>
                    </View>
                </View>

                {/* Contract Title */}
                <BaseText type="Body" weight={600} color="labels.primary">
                    {template.title}
                </BaseText>

                {/* Contract Body */}
                <View>
                    {Array.isArray(template.body) ? (
                        // New format: array of body items
                        template.body.map((item, index) => {
                            if (item.type === "paragraph" && item.data.content) {
                                // First replace placeholders in HTML, then strip HTML
                                const htmlWithReplacements = replacePlaceholders(item.data.content);
                                const text = stripHtml(htmlWithReplacements);

                                // Now highlight the replaced values
                                const patientName = `${patient.first_name} ${patient.last_name}`;
                                const practiceName = practice.name || "";

                                return (
                                    <View key={index} className="mb-4">
                                        <BaseText type="Body" color="labels.primary" style={{ lineHeight: 21 }}>
                                            {text.split("\n").map((line, lineIndex) => {
                                                if (!line.trim()) {
                                                    return <React.Fragment key={lineIndex}>{"\n"}</React.Fragment>;
                                                }

                                                // Find replaced values in the line
                                                const parts: Array<{ text: string; isHighlight: boolean }> = [];
                                                let lastIndex = 0;

                                                // Find patient name
                                                let nameIndex = line.indexOf(patientName, lastIndex);
                                                while (nameIndex !== -1) {
                                                    if (nameIndex > lastIndex) {
                                                        parts.push({ text: line.substring(lastIndex, nameIndex), isHighlight: false });
                                                    }
                                                    parts.push({ text: patientName, isHighlight: true });
                                                    lastIndex = nameIndex + patientName.length;
                                                    nameIndex = line.indexOf(patientName, lastIndex);
                                                }

                                                // Find practice name
                                                let practiceIndex = line.indexOf(practiceName, lastIndex);
                                                while (practiceIndex !== -1) {
                                                    if (practiceIndex > lastIndex) {
                                                        parts.push({ text: line.substring(lastIndex, practiceIndex), isHighlight: false });
                                                    }
                                                    parts.push({ text: practiceName, isHighlight: true });
                                                    lastIndex = practiceIndex + practiceName.length;
                                                    practiceIndex = line.indexOf(practiceName, lastIndex);
                                                }

                                                if (lastIndex < line.length) {
                                                    parts.push({ text: line.substring(lastIndex), isHighlight: false });
                                                }

                                                if (parts.length === 0) {
                                                    parts.push({ text: line, isHighlight: false });
                                                }

                                                return (
                                                    <React.Fragment key={lineIndex}>
                                                        {parts.map((part, partIndex) => (
                                                            <BaseText key={partIndex} type="Subhead" color={part.isHighlight ? "system.blue" : "labels.primary"}>
                                                                {part.text}
                                                            </BaseText>
                                                        ))}
                                                        {lineIndex < text.split("\n").length - 1 && "\n"}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </BaseText>
                                    </View>
                                );
                            } else if (item.type === "radio_group" && item.data.label) {
                                return <RadioGroupComponent key={index} label={item.data.label} options={item.data.options || []} />;
                            }
                            return null;
                        })
                    ) : (
                        // Old format: string
                        <BaseText type="Subhead" color="labels.primary" style={{ lineHeight: 21 }}>
                            {replacePlaceholders(typeof template.body === "string" ? template.body : String(template.body || ""))
                                .split("\n")
                                .map((line, index) => (
                                    <React.Fragment key={index}>
                                        {line}
                                        {index < replacePlaceholders(typeof template.body === "string" ? template.body : String(template.body || "")).split("\n").length - 1 && "\n"}
                                    </React.Fragment>
                                ))}
                        </BaseText>
                    )}
                </View>

                {/* Signature Section */}
                <View className="gap-4 flex-row items-center my-6">
                    <BaseText type="Subhead" color="labels.primary">
                        Patient Signature:
                    </BaseText>
                    {signature ? (
                        <TouchableOpacity onPress={() => setShowSignatureModal(true)} className="bg-white rounded-xl p-4 items-center justify-center border-2 border-dashed" style={{ minHeight: 150, borderColor: colors.system.gray4 }}>
                            {signatureUri && signatureUri.startsWith("data:") ? (
                                <Image source={{ uri: signatureUri }} className="w-full h-32" resizeMode="contain" />
                            ) : signatureUri ? (
                                <Image source={{ uri: signatureUri }} className="w-full h-32" resizeMode="contain" />
                            ) : (
                                <Image source={{ uri: `data:image/svg+xml;base64,${signature}` }} className="w-full h-32" resizeMode="contain" />
                            )}
                        </TouchableOpacity>
                    ) : (
                        <BaseButton
                            ButtonStyle="Filled"
                            leftIcon={<IconSymbol name="pencil.and.outline" color={colors.system.white} size={16} />}
                            onPress={() => {
                                setShowSignatureModal(true);
                            }}
                            label="Draw Signature"
                        />
                    )}
                </View>

                {/* Submit Button */}
                {/* <BaseButton ButtonStyle="Filled" onPress={handleSubmit} disabled={!signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature} className="mb-6">
                    {isUploadingSignature ? "Uploading signature..." : isSubmitting ? "Submitting..." : "Submit Contract"}
                </BaseButton> */}
            </ScrollView>

            {/* Signature Modal */}
            {showSignatureModal && <SignatureModal onSave={handleSignature} onCancel={() => setShowSignatureModal(false)} />}
        </View>
    );
}

// Radio Group Component
function RadioGroupComponent({ label, options }: { label: string; options: string[] }) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    return (
        <View className="mb-4">
            <BaseText type="Body" weight={600} color="labels.primary" className="mb-3">
                {label}
            </BaseText>
            <View className="flex-row gap-6">
                {options.map((option, index) => (
                    <TouchableOpacity key={index} onPress={() => setSelectedOption(option)} className="flex-row items-center gap-2">
                        <View
                            className="w-6 h-6 rounded-full border-2 relative"
                            style={{
                                borderColor: selectedOption === option ? colors.system.blue : colors.system.gray2,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {selectedOption === option && <View className="rounded-full  flex-1 w-3 h-3 bg-system-blue absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
                        </View>
                        <BaseText type="Body" color={selectedOption === option ? "labels.primary" : "labels.primary"}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </BaseText>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// Signature Modal Component
const SignatureModal = React.memo(function SignatureModal({ onSave, onCancel }: { onSave: (base64: string, uri?: string) => void; onCancel: () => void }) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const signatureRef = useRef<SignatureViewRef>(null);

    const snapPoints = useMemo(() => ["75%"], []);

    const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />, []);

    // Present modal when component mounts
    React.useEffect(() => {
        // Use setTimeout to ensure the modal is ready
        const timer = setTimeout(() => {
            bottomSheetModalRef.current?.present();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSave = () => {
        if (signatureRef.current) {
            signatureRef.current.readSignature();
        }
    };

    const handleSignature = (data: string) => {
        // react-native-signature-canvas returns base64 data URL
        const base64 = data.includes(",") ? data.split(",")[1] : data;
        const uri = data.startsWith("data:") ? data : `data:image/png;base64,${base64}`;
        onSave(base64, uri);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleUndo = useCallback(() => {
        try {
            if (signatureRef.current) {
                signatureRef.current.undo();
            }
        } catch (error) {
            console.error("Error in undo:", error);
        }
    }, []);

    const handleRedo = useCallback(() => {
        try {
            if (signatureRef.current) {
                signatureRef.current.redo();
            }
        } catch (error) {
            console.error("Error in redo:", error);
        }
    }, []);

    const handleClear = useCallback(() => {
        try {
            if (signatureRef.current) {
                signatureRef.current.clearSignature();
            }
        } catch (error) {
            console.error("Error in clear:", error);
        }
    }, []);

    const webStyle = `
        body,html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
        }
        .m-signature-pad {
            position: absolute;
            font-size: 10px;
            width: 100%;
            height: 100%;
            border: none;
            background-color: white;
            box-shadow: none;
        }
        .m-signature-pad--body {
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            border: none;
        }
        .m-signature-pad--body canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            border-radius: 12px;
        }
        .m-signature-pad--footer {
            display: none !important;
        }
        .m-signature-pad--footer .button {
            display: none !important;
        }
        .m-signature-pad--footer .button.clear {
            display: none !important;
        }
        .m-signature-pad--footer .button.save {
            display: none !important;
        }
    `;

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            onDismiss={onCancel}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={false}
            enableHandlePanningGesture={false}
            enableDynamicSizing={false}
            enableOverDrag={false}
            handleStyle={{ display: "none" }}
            backgroundStyle={{ backgroundColor: colors.system.gray6 }}
            handleIndicatorStyle={{ backgroundColor: colors.system.gray3 }}
        >
            <View className="flex-1 py-4">
                {/* Header */}
                <View className="h-[44px] flex-row items-center justify-between px-4 mb-4">
                    <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} className="px-2 py-[11px]">
                        <BaseText type="Body" color="system.blue">
                            Cancel
                        </BaseText>
                    </TouchableOpacity>
                    <BaseText type="Body" weight={600} color="labels.primary">
                        Draw Signature
                    </BaseText>
                    <TouchableOpacity onPress={handleSave} className="px-4 py-[11px]">
                        <BaseText type="Body" color="system.blue">
                            Save
                        </BaseText>
                    </TouchableOpacity>
                </View>

                {/* Canvas */}
                <View className="flex-1 px-5 py-0">
                    <View className="flex-1 bg-white rounded-xl overflow-hidden" style={{ minHeight: 300 }}>
                        <SignatureCanvas
                            ref={signatureRef}
                            onOK={handleSignature}
                            descriptionText=""
                            clearText=""
                            confirmText=""
                            webStyle={webStyle}
                            autoClear={false}
                            imageType="image/png"
                            style={{ flex: 1 }}
                            nestedScrollEnabled={true}
                            androidLayerType="hardware"
                            webviewContainerStyle={{ flex: 1 }}
                            scrollable={false}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>

                {/* Controls */}
                <View className="flex-row items-center justify-between px-10 py-5">
                    <View className="flex-row gap-5">
                        <TouchableOpacity onPress={handleUndo} className="w-7 h-7 items-center justify-center">
                            <IconSymbol name="arrow.uturn.backward" color={colors.labels.secondary} size={22} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRedo} className="w-7 h-7 items-center justify-center">
                            <IconSymbol name="arrow.uturn.forward" color={colors.labels.secondary} size={22} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handleClear} className="w-7 h-7 items-center justify-center">
                        <IconSymbol name="trash" color={colors.system.red} size={22} />
                    </TouchableOpacity>
                </View>
            </View>
        </BottomSheetModal>
    );
});
