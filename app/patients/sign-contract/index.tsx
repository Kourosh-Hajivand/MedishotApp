import { BaseButton, BaseText, ErrorState, PracticeDocumentFooter, PracticeDocumentHeader } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { headerHeight } from "@/constants/theme";
import colors from "@/theme/colors";
import { formatDate } from "@/utils/helper/dateUtils";
import { useCreateContract, useGetContractTemplate, useGetPatientById, useGetPracticeById, useTempUpload } from "@/utils/hook";
import { useAuth } from "@/utils/hook/useAuth";
import { useProfileStore } from "@/utils/hook/useProfileStore";
import { ContractTemplate, Patient, Practice } from "@/utils/service/models/ResponseModels";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SignatureCanvas, { SignatureViewRef } from "react-native-signature-canvas";
import ViewShot, { captureRef } from "react-native-view-shot";

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
    avatar: "logo",
    practiceName: true,
    doctorName: true,
    address: true,
    practicePhone: true,
    practiceURL: true,
    practiceEmail: true,
    practiceSocialMedia: true,
};

export default function SignContractScreen() {
    const { patientId, templateId } = useLocalSearchParams<{ patientId: string; templateId: string }>();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { selectedPractice } = useProfileStore();
    const { profile: me } = useAuth();

    const { data: contractTemplate, isLoading: isLoadingTemplate, error: templateError, isError: isTemplateError, refetch: refetchTemplate } = useGetContractTemplate(templateId || "", !!templateId);
    const { data: patientData, isLoading: isLoadingPatient, error: patientError, isError: isPatientError, refetch: refetchPatient } = useGetPatientById(patientId || "");
    const { data: practiceData, isLoading: isLoadingPractice, error: practiceError, isError: isPracticeError, refetch: refetchPractice } = useGetPracticeById(selectedPractice?.id || 0, !!selectedPractice?.id);

    const [signature, setSignature] = useState<string | null>(null);
    const [signatureUri, setSignatureUri] = useState<string | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [uploadedSignatureFilename, setUploadedSignatureFilename] = useState<string | null>(null);
    const [radioGroupAnswers, setRadioGroupAnswers] = useState<Record<number, string | null>>({});
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [signatureFileUri, setSignatureFileUri] = useState<string | null>(null);
    const [isCapturingView, setIsCapturingView] = useState(false);
    const contractViewRef = useRef<ViewShot>(null);

    // Initialize radio groups with default "yes" value when template loads
    React.useEffect(() => {
        const template = contractTemplate?.data;
        if (template && Array.isArray(template.body)) {
            const defaultAnswers: Record<number, string> = {};
            const radioTypes = ["radio_group", "radio_group_block", "radio_group_inline"];
            template.body.forEach((item, index) => {
                const opts = item.data?.options ?? [];
                if (radioTypes.includes(item.type) && opts.length > 0) {
                    const defaultOption = opts.find((o) => String(o).trim().toLowerCase() === "no") ?? opts[0];
                    defaultAnswers[index] = defaultOption;
                }
            });
            if (Object.keys(defaultAnswers).length > 0) {
                setRadioGroupAnswers((prev) => {
                    // Only set if not already set (to preserve user changes)
                    const updated = { ...prev };
                    Object.keys(defaultAnswers).forEach((key) => {
                        const index = Number(key);
                        if (updated[index] === null || updated[index] === undefined) {
                            updated[index] = defaultAnswers[index];
                        }
                    });
                    return updated;
                });
            }
        }
    }, [contractTemplate?.data]);

    const [isUploadingPDF, setIsUploadingPDF] = useState(false);
    const [pendingPDFFileId, setPendingPDFFileId] = useState<string | null>(null);

    const { mutate: uploadSignature, isPending: isUploadingSignature } = useTempUpload(
        (response) => {
            // Handle both wrapped and unwrapped response structures
            const responseAny = response as any;
            // Try to get id first (from backend), then filename (Livewire temp filename)
            const id = (responseAny?.data?.id ?? response.id) || null;
            const filename = (responseAny?.data?.filename ?? response.filename) || null;
            const fileId = id || filename;

            if (isUploadingPDF && fileId) {
                // If we're uploading PDF, submit contract data immediately
                submitContractData(String(fileId));
                setIsUploadingPDF(false);
            } else if (fileId) {
                // Otherwise it's signature upload
                setUploadedSignatureFilename(String(fileId));
            }
        },
        (error) => {
            Alert.alert("Error", error.message || "Failed to upload file");
            setIsUploadingPDF(false);
        },
    );

    const { mutate: createContract, isPending: isSubmitting } = useCreateContract(
        () => {
            router.back();
            // Set tab param so patient detail page switches to Consent tab
            router.setParams({ tab: "consent" });
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

    // Radio groups are now optional - they default to "yes" but user can change them
    // We don't need to check if they're answered anymore

    // Function to generate PDF
    const generateContractPDF = useCallback(async (): Promise<string | null> => {
        if (!contractViewRef.current) {
            return null;
        }

        try {
            setIsGeneratingPDF(true);
            setIsCapturingView(true); // Show the view for capture

            // Wait for view to be visible and rendered
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Wait for layout to complete
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Use captureRef to capture the ViewShot
            const uri = await captureRef(contractViewRef.current, {
                format: "png",
                quality: 1.0,
                result: "tmpfile",
                snapshotContentContainer: false,
            });

            return uri;
        } catch (error) {
            Alert.alert("Error", "Failed to generate contract PDF: " + (error instanceof Error ? error.message : String(error)));
            return null;
        } finally {
            setIsCapturingView(false);
            setIsGeneratingPDF(false);
        }
    }, []);

    // Function to actually submit (called after PDF is uploaded)
    const submitContractData = useCallback(
        (pdfFileId: string) => {
            // Build body array with selectedValue for radio groups
            const template = contractTemplate?.data;
            let bodyString: string | undefined = undefined;
            let bodyArray: any[] = [];

            if (template && Array.isArray(template.body)) {
                const radioTypes = ["radio_group", "radio_group_block", "radio_group_inline"];
                // Deep clone the body array and add selectedValue to radio groups
                bodyArray = template.body.map((item, index) => {
                    if (radioTypes.includes(item.type) && radioGroupAnswers[index] !== null && radioGroupAnswers[index] !== undefined) {
                        const raw = String(radioGroupAnswers[index]).trim().toLowerCase();
                        const selectedValue = raw === "yes" || raw === "yas"; // support "yas" typo from template
                        return {
                            ...item,
                            data: {
                                ...item.data,
                                selectedValue,
                            },
                        };
                    }
                    return item;
                });

                // Convert body array to JSON string
                bodyString = JSON.stringify(bodyArray);
            } else if (template && typeof template.body === "string") {
                // If body is a string (old format), keep it as is
                bodyString = template.body;
            }

            const requestData = {
                patientId: patientId || "",
                data: {
                    contract_template_id: Number(templateId),
                    signature_image: uploadedSignatureFilename!,
                    contract_file: pdfFileId, // PDF file ID
                    body: bodyString,
                },
            };

            createContract(requestData);
        },
        [patientId, templateId, uploadedSignatureFilename, contractTemplate, radioGroupAnswers, createContract],
    );

    const handleSubmit = useCallback(async () => {
        if (!signature || !uploadedSignatureFilename) {
            Alert.alert("Error", "Please sign the contract first");
            return;
        }

        if (!contractViewRef.current) {
            // Wait a bit and try again
            await new Promise((resolve) => setTimeout(resolve, 1000));
            if (!contractViewRef.current) {
                Alert.alert("Error", "PDF view is not ready. Please try again.");
                return;
            }
        }

        try {
            // Generate PDF first
            const pdfUri = await generateContractPDF();

            if (!pdfUri) {
                return; // Error already shown in generateContractPDF
            }

            // Upload PDF to temp storage immediately
            setIsUploadingPDF(true);
            const pdfFile = {
                uri: pdfUri,
                type: "image/png",
                name: `contract_${Date.now()}.png`,
            } as any;

            // Use temp upload for PDF - will trigger submitContractData in uploadSignature callback
            uploadSignature(pdfFile);
        } catch (error) {
            Alert.alert("Error", "Failed to process contract: " + (error instanceof Error ? error.message : String(error)));
            setIsUploadingPDF(false);
        }
    }, [signature, uploadedSignatureFilename, generateContractPDF, uploadSignature]);

    // Setup header with patient info and Done button - MUST be before early returns
    const patient = patientData?.data;
    const practice = practiceData?.data;
    const template = contractTemplate?.data;

    // Doctor display name: patient.doctor or current user (me) — MUST be before early returns
    const doctorDisplayName = useMemo(() => {
        if (patient?.doctor?.first_name != null || patient?.doctor?.last_name != null) {
            const first = patient.doctor.first_name ?? "";
            const last = patient.doctor.last_name ?? "";
            const full = `${first} ${last}`.trim();
            return full ? (full.startsWith("Dr.") ? full : `Dr. ${full}`) : "";
        }
        if (me?.first_name != null || me?.last_name != null) {
            const first = me.first_name ?? "";
            const last = me.last_name ?? "";
            const full = `${first} ${last}`.trim();
            return full ? (full.startsWith("Dr.") ? full : `Dr. ${full}`) : "";
        }
        return "";
    }, [patient?.doctor, me?.first_name, me?.last_name]);
    const isDoneDisabled = !signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature || isUploadingPDF || isGeneratingPDF;

    const isLoading = isLoadingTemplate || isLoadingPatient || isLoadingPractice;
    const isError = isTemplateError || isPatientError || isPracticeError;
    const error = templateError || patientError || practiceError;

    useLayoutEffect(() => {
        if (!patient) {
            // Set default header when patient is not loaded
            navigation.setOptions({
                headerTitle: "",
                headerTitleAlign: "center",

                headerRight: () => {
                    const currentIsDoneDisabled = !signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature || isUploadingPDF || isGeneratingPDF;
                    return (
                        <TouchableOpacity onPress={handleSubmit} disabled={currentIsDoneDisabled} className="px-4 py-2">
                            <BaseText type="Body" color={currentIsDoneDisabled ? "labels.tertiary" : "system.blue"} weight={600}>
                                {isGeneratingPDF || isUploadingPDF ? "Processing..." : isSubmitting ? "Submitting..." : "Done"}
                            </BaseText>
                        </TouchableOpacity>
                    );
                },
            });
            return;
        }

        const patientName = `${patient.first_name} ${patient.last_name}`;
        const patientImageUrl = patient.profile_image?.url;
        const photoDate = patient.profile_image?.created_at ? formatDate(patient.profile_image.created_at, "MMM D, YYYY") : patient.created_at ? formatDate(patient.created_at, "MMM D, YYYY") : "";

        navigation.setOptions({
            headerTitle: "",
            headerTitleAlign: "center",
            headerTransparent: true,
            headerRight: () => {
                const currentIsDoneDisabled = !signature || !uploadedSignatureFilename || isSubmitting || isUploadingSignature || isUploadingPDF || isGeneratingPDF;
                return (
                    <TouchableOpacity onPress={handleSubmit} disabled={currentIsDoneDisabled} className="px-2 py-2">
                        <BaseText type="Body" color={currentIsDoneDisabled ? "labels.tertiary" : "system.blue"} weight={600}>
                            {isGeneratingPDF || isUploadingPDF ? "Processing..." : isSubmitting ? "Submitting..." : "Done"}
                        </BaseText>
                    </TouchableOpacity>
                );
            },
        });
    }, [patient, signature, uploadedSignatureFilename, isSubmitting, isUploadingSignature, isUploadingPDF, isGeneratingPDF, navigation, handleSubmit]);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    if (isError) {
        return (
            <View className="flex-1 items-center justify-center">
                <ErrorState
                    message={(error as any)?.message || "Failed to load contract data"}
                    onRetry={() => {
                        refetchTemplate();
                        refetchPatient();
                        refetchPractice();
                    }}
                    title="Failed to load contract"
                />
            </View>
        );
    }

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

        let signatureDataUri = uri;
        if (!signatureDataUri && base64) {
            // If we only have base64, create a data URI
            signatureDataUri = `data:image/png;base64,${base64}`;
        }

        if (signatureDataUri) {
            setSignatureUri(signatureDataUri);

            // Convert data URI to file URI for ViewShot compatibility
            try {
                if (signatureDataUri.startsWith("data:")) {
                    const base64Data = signatureDataUri.split(",")[1];
                    if (!FileSystem.documentDirectory) {
                        setSignatureFileUri(null);
                    } else {
                        const fileUri = `${FileSystem.documentDirectory}signature_${Date.now()}.png`;
                        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        setSignatureFileUri(fileUri);
                    }
                } else {
                    setSignatureFileUri(signatureDataUri);
                }
            } catch {
                // Fallback to data URI if file save fails
                setSignatureFileUri(null);
            }

            // Upload signature to temp storage
            try {
                const filename = `signature_${Date.now()}.png`;
                const file = {
                    uri: signatureDataUri,
                    type: "image/png",
                    name: filename,
                } as any;

                uploadSignature(file);
            } catch (error) {
                Alert.alert("Error", "Failed to prepare signature for upload");
            }
        }
        setShowSignatureModal(false);
    };

    // Helper function to replace placeholders in text (#Placeholder# and {placeholder} formats)
    const replacePlaceholders = (text: string): string => {
        if (!patient || !practice) return text;
        const patientFullName = `${patient.first_name} ${patient.last_name}`.trim();
        const practiceName = practice.name || "";
        return text
            .replace(/#PatientName#/gi, patientFullName)
            .replace(/#DoctorName#/gi, doctorDisplayName)
            .replace(/#PracticeName#/gi, practiceName)
            .replace(/#name#/g, patientFullName)
            .replace(/#practise#/g, practiceName)
            .replace(/\{patient_name\}/gi, patientFullName)
            .replace(/\{practice_name\}/gi, practiceName)
            .replace(/\{doctor_name\}/gi, doctorDisplayName)
            .replace(/\{PatientName\}/g, patientFullName)
            .replace(/\{DoctorName\}/g, doctorDisplayName)
            .replace(/\{PracticeName\}/g, practiceName)
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

                <View className="w-full">
                    <PracticeDocumentHeader practice={practice} printSettings={printSettings} doctor={patient.doctor} me={me || undefined} variant="document" />
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

                                // Now highlight the replaced values (patient, doctor, practice)
                                const patientName = `${patient.first_name} ${patient.last_name}`.trim();
                                const practiceName = practice.name || "";

                                return (
                                    <View key={index} className="mb-4">
                                        <BaseText type="Body" color="labels.primary" style={{ lineHeight: 21 }}>
                                            {text.split("\n").map((line, lineIndex) => {
                                                if (!line.trim()) {
                                                    return <React.Fragment key={lineIndex}>{"\n"}</React.Fragment>;
                                                }

                                                // Find replaced values in the line (order: patient, doctor, practice)
                                                const parts: Array<{ text: string; isHighlight: boolean }> = [];
                                                let lastIndex = 0;
                                                const highlights = [
                                                    { value: patientName, len: patientName.length },
                                                    { value: doctorDisplayName, len: doctorDisplayName.length },
                                                    { value: practiceName, len: practiceName.length },
                                                ].filter((h) => h.len > 0);

                                                const nextMatch = (from: number): { index: number; value: string; len: number } | null => {
                                                    let nearest: { index: number; value: string; len: number } | null = null;
                                                    for (const h of highlights) {
                                                        const i = line.indexOf(h.value, from);
                                                        if (i !== -1 && (nearest == null || i < nearest.index)) {
                                                            nearest = { index: i, value: h.value, len: h.len };
                                                        }
                                                    }
                                                    return nearest;
                                                };

                                                let match = nextMatch(lastIndex);
                                                while (match) {
                                                    if (match.index > lastIndex) {
                                                        parts.push({ text: line.substring(lastIndex, match.index), isHighlight: false });
                                                    }
                                                    parts.push({ text: match.value, isHighlight: true });
                                                    lastIndex = match.index + match.len;
                                                    match = nextMatch(lastIndex);
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
                            } else if ((item.type === "radio_group" || item.type === "radio_group_block" || item.type === "radio_group_inline") && item.data?.label) {
                                return (
                                    <RadioGroupComponent
                                        key={index}
                                        index={index}
                                        label={item.data.label}
                                        options={item.data.options || []}
                                        selectedOption={radioGroupAnswers[index] || null}
                                        onSelect={(option) => {
                                            setRadioGroupAnswers((prev) => ({
                                                ...prev,
                                                [index]: option,
                                            }));
                                        }}
                                        layout="block"
                                    />
                                );
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
                <View className="gap-4 flex-row items-center">
                    <BaseText type="Subhead" color="labels.primary">
                        Patient Signature:
                    </BaseText>
                    {signature ? (
                        <TouchableOpacity onPress={() => setShowSignatureModal(true)} className="bg-white rounded-xl items-center justify-center border-2 border-dashed overflow-hidden" style={{ flex: 1, aspectRatio: 1, borderColor: colors.system.gray4 }}>
                            {signatureUri && signatureUri.startsWith("data:") ? (
                                <Image source={{ uri: signatureUri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                            ) : signatureUri ? (
                                <Image source={{ uri: signatureUri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                            ) : (
                                <Image source={{ uri: `data:image/svg+xml;base64,${signature}` }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
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

                {/* <PracticeDocumentFooter printSettings={printSettings} metadata={metadata} variant="document" showIcons /> */}
            </ScrollView>

            {/* Signature Modal */}
            {showSignatureModal && <SignatureModal onSave={handleSignature} onCancel={() => setShowSignatureModal(false)} />}

            {/* ViewShot for PDF generation - US Letter size (8.5" x 11") at 96 DPI */}
            {/* Render only when capturing to avoid viewport issues */}
            {patient && practice && template && isCapturingView && (
                <View
                    style={{
                        position: "absolute",
                        left: -10000, // Move off-screen
                        top: 0,
                        width: 816,
                        height: 1056,
                        overflow: "hidden",
                        opacity: 0, // Make invisible
                        backgroundColor: "white",
                    }}
                    collapsable={false}
                    pointerEvents="none"
                >
                    <ViewShot
                        ref={contractViewRef}
                        style={{
                            width: 816, // US Letter width: 8.5" x 96 DPI = 816px
                            height: 1056, // US Letter height: 11" x 96 DPI = 1056px
                            backgroundColor: "white",
                            padding: 40,
                        }}
                    >
                        <ContractPDFContent template={template} patient={patient} practice={practice} doctorDisplayName={doctorDisplayName} signatureUri={signatureFileUri || signatureUri} radioGroupAnswers={radioGroupAnswers} printSettings={printSettings} replacePlaceholders={replacePlaceholders} stripHtml={stripHtml} metadata={metadata} />
                    </ViewShot>
                </View>
            )}

            {/* Always rendered but hidden - for initial setup */}
            {patient && practice && template && !isCapturingView && (
                <View
                    style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                        width: 816,
                        height: 1056,
                        overflow: "hidden",
                        left: 0,
                        top: 0,
                    }}
                    collapsable={false}
                >
                    <ViewShot
                        ref={contractViewRef}
                        style={{
                            width: 816,
                            height: 1056,
                            backgroundColor: "white",
                            padding: 40,
                        }}
                    >
                        <ContractPDFContent template={template} patient={patient} practice={practice} doctorDisplayName={doctorDisplayName} signatureUri={signatureFileUri || signatureUri} radioGroupAnswers={radioGroupAnswers} printSettings={printSettings} replacePlaceholders={replacePlaceholders} stripHtml={stripHtml} metadata={metadata} />
                    </ViewShot>
                </View>
            )}
        </View>
    );
}

// Radio Group Component — layout: block = label on top, options below (vertical); inline = label + options in one row (radio then text)
function RadioGroupComponent({
    index,
    label,
    options,
    selectedOption,
    onSelect,
    layout = "default",
}: {
    index: number;
    label: string;
    options: string[];
    selectedOption: string | null;
    onSelect: (option: string) => void;
    layout?: "default" | "block" | "inline";
}) {
    const radioOption = (option: string, optionIndex: number) => (
        <TouchableOpacity key={optionIndex} onPress={() => onSelect(option)} className="flex-row items-center gap-2">
            <View
                className="w-6 h-6 rounded-full border-2 relative"
                style={{
                    borderColor: selectedOption === option ? colors.system.blue : colors.system.gray2,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {selectedOption === option && <View className="rounded-full flex-1 w-3 h-3 bg-system-blue absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
            </View>
            <BaseText type="Subhead" color="labels.primary">
                {option.charAt(0).toUpperCase() + option.slice(1)}
            </BaseText>
        </TouchableOpacity>
    );

    if (layout === "block") {
        // Label on top, then one row: both radio options side by side below the text
        return (
            <View className="mb-4">
                <BaseText type="Subhead" weight={600} color="labels.primary" className="mb-3">
                    {label}
                </BaseText>
                <View className="flex-row gap-6">
                    {options.map((option, optionIndex) => radioOption(option, optionIndex))}
                </View>
            </View>
        );
    }

    if (layout === "inline") {
        // One row: first [radio text] [radio text] ..., then label (radio then text per option)
        return (
            <View className="mb-4 flex-row flex-wrap items-center gap-4">
                <View className="flex-row gap-6">
                    {options.map((option, optionIndex) => radioOption(option, optionIndex))}
                </View>
                <BaseText type="Subhead" weight={600} color="labels.primary">
                    {label}
                </BaseText>
            </View>
        );
    }

    // default: label on top, options in one row
    return (
        <View className="mb-4">
            <BaseText type="Subhead" weight={600} color="labels.primary" className="mb-3">
                {label}
            </BaseText>
            <View className="flex-row gap-6">
                {options.map((option, optionIndex) => radioOption(option, optionIndex))}
            </View>
        </View>
    );
}

// Signature Modal Component
const SignatureModal = React.memo(function SignatureModal({ onSave, onCancel }: { onSave: (base64: string, uri?: string) => void; onCancel: () => void }) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const signatureRef = useRef<SignatureViewRef>(null);

    const snapPoints = useMemo(() => ["60%"], []);

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
        } catch {
            // Silent fail
        }
    }, []);

    const handleRedo = useCallback(() => {
        try {
            if (signatureRef.current) {
                signatureRef.current.redo();
            }
        } catch {
            // Silent fail
        }
    }, []);

    const handleClear = useCallback(() => {
        try {
            if (signatureRef.current) {
                signatureRef.current.clearSignature();
            }
        } catch {
            // Silent fail
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
                    <View className="bg-white rounded-xl overflow-hidden" style={{ aspectRatio: 1, width: "100%" }}>
                        <SignatureCanvas
                            ref={signatureRef}
                            onOK={handleSignature}
                            descriptionText=""
                            clearText=""
                            confirmText=""
                            webStyle={webStyle}
                            autoClear={false}
                            imageType="image/png"
                            style={{ width: "100%", height: "100%" }}
                            nestedScrollEnabled={true}
                            androidLayerType="hardware"
                            webviewContainerStyle={{ width: "100%", height: "100%" }}
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

// Contract PDF Content Component (A4 layout)
interface ContractPDFContentProps {
    template: ContractTemplate;
    patient: Patient;
    practice: Practice;
    doctorDisplayName: string;
    signatureUri: string | null;
    radioGroupAnswers: Record<number, string | null>;
    printSettings: PracticeSettings;
    replacePlaceholders: (text: string) => string;
    stripHtml: (html: string) => string;
    metadata: any;
}

const ContractPDFContent = React.memo(function ContractPDFContent({ template, patient, practice, doctorDisplayName, signatureUri, radioGroupAnswers, printSettings, replacePlaceholders, stripHtml, metadata }: ContractPDFContentProps) {
    const { profile: me } = useAuth();

    return (
        <View style={{ flex: 1, backgroundColor: "white" }}>
            {/* Header */}
            <PracticeDocumentHeader practice={practice} printSettings={printSettings} doctor={patient.doctor || null} me={me || undefined} variant="document" />

            {/* Contract Title */}
            <BaseText type="Body" weight={600} color="labels.primary" style={{ marginBottom: 36, marginTop: 16, fontSize: 16, textAlign: "center" }}>
                {template.title}
            </BaseText>

            {/* Contract Body */}
            <View style={{ marginBottom: 0 }}>
                {Array.isArray(template.body) ? (
                    template.body.map((item: any, index: number) => {
                        if (item.type === "paragraph" && item.data.content) {
                            const htmlWithReplacements = replacePlaceholders(item.data.content);
                            const text = stripHtml(htmlWithReplacements);
                            const patientName = `${patient.first_name} ${patient.last_name}`.trim();
                            const practiceName = practice.name || "";
                            const highlights = [
                                { value: patientName, len: patientName.length },
                                { value: doctorDisplayName, len: doctorDisplayName.length },
                                { value: practiceName, len: practiceName.length },
                            ].filter((h) => h.len > 0);

                            const nextMatch = (line: string, from: number): { index: number; value: string; len: number } | null => {
                                let nearest: { index: number; value: string; len: number } | null = null;
                                for (const h of highlights) {
                                    const i = line.indexOf(h.value, from);
                                    if (i !== -1 && (nearest == null || i < nearest.index)) {
                                        nearest = { index: i, value: h.value, len: h.len };
                                    }
                                }
                                return nearest;
                            };

                            return (
                                <View key={index} style={{ marginBottom: 12 }}>
                                    <BaseText type="Body" color="labels.primary" style={{ lineHeight: 18, fontSize: 11 }}>
                                        {text.split("\n").map((line, lineIndex) => {
                                            if (!line.trim()) {
                                                return <React.Fragment key={lineIndex}>{"\n"}</React.Fragment>;
                                            }

                                            const parts: Array<{ text: string; isHighlight: boolean }> = [];
                                            let lastIndex = 0;
                                            let match = nextMatch(line, lastIndex);
                                            while (match) {
                                                if (match.index > lastIndex) {
                                                    parts.push({ text: line.substring(lastIndex, match.index), isHighlight: false });
                                                }
                                                parts.push({ text: match.value, isHighlight: true });
                                                lastIndex = match.index + match.len;
                                                match = nextMatch(line, lastIndex);
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
                                                        <BaseText key={partIndex} type="Subhead" color={part.isHighlight ? "system.blue" : "labels.primary"} style={{ fontSize: 11 }}>
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
                        } else if ((item.type === "radio_group" || item.type === "radio_group_block" || item.type === "radio_group_inline") && item.data?.label) {
                            const selectedAnswer = radioGroupAnswers[index];
                            const options = (item.data.options || []) as string[];
                            const layout = item.type === "radio_group_block" ? "block" : item.type === "radio_group_inline" ? "inline" : "default";

                            const renderRadioOption = (option: string, optionIndex: number) => {
                                const isSelected = selectedAnswer === option;
                                return (
                                    <View key={optionIndex} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                        <View
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: 8,
                                                borderWidth: 2,
                                                borderColor: isSelected ? colors.system.blue : colors.system.gray2,
                                                justifyContent: "center",
                                                alignItems: "center",
                                                backgroundColor: "white",
                                            }}
                                        >
                                            {isSelected && (
                                                <View
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: colors.system.blue,
                                                    }}
                                                />
                                            )}
                                        </View>
                                        <BaseText type="Subhead" color="labels.primary" style={{ fontSize: 11 }}>
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </BaseText>
                                    </View>
                                );
                            };

                            if (layout === "block") {
                                return (
                                    <View key={index} style={{ marginBottom: 12, marginTop: 8 }}>
                                        <BaseText type="Subhead" weight={600} color="labels.primary" style={{ fontSize: 11, marginBottom: 6 }}>
                                            {item.data.label}
                                        </BaseText>
                                        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                                            {options.map((option, optionIndex) => renderRadioOption(option, optionIndex))}
                                        </View>
                                    </View>
                                );
                            }

                            if (layout === "inline") {
                                return (
                                    <View key={index} style={{ marginBottom: 12, marginTop: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                                        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                                            {options.map((option, optionIndex) => renderRadioOption(option, optionIndex))}
                                        </View>
                                        <BaseText type="Subhead" weight={600} color="labels.primary" style={{ fontSize: 11 }}>
                                            {item.data.label}
                                        </BaseText>
                                    </View>
                                );
                            }

                            return (
                                <View key={index} style={{ marginBottom: 12, marginTop: 8 }}>
                                    <BaseText type="Subhead" weight={600} color="labels.primary" style={{ fontSize: 11, marginBottom: 6 }}>
                                        {item.data.label}
                                    </BaseText>
                                    <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                                        {options.map((option, optionIndex) => renderRadioOption(option, optionIndex))}
                                    </View>
                                </View>
                            );
                        }
                        return null;
                    })
                ) : (
                    <BaseText type="Subhead" color="labels.primary" style={{ lineHeight: 18, fontSize: 11 }}>
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
            <View style={{ marginTop: 0, flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 0 }}>
                    <BaseText type="Subhead" color="labels.primary" style={{ fontWeight: "600", fontSize: 11 }}>
                        Patient Signature:
                    </BaseText>
                    {signatureUri ? (
                        <View style={{ width: 180, height: 150, overflow: "hidden", backgroundColor: "transparent", justifyContent: "center", alignItems: "center" }}>
                            <Image
                                source={{
                                    uri: (signatureUri.startsWith("data:") || signatureUri.startsWith("http") || signatureUri.startsWith("file://") ? signatureUri : `data:image/png;base64,${signatureUri}`) || "",
                                }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="contain"
                            />
                        </View>
                    ) : (
                        <BaseText type="Body" color="labels.secondary" style={{ fontSize: 11 }}>
                            [Signature Required]
                        </BaseText>
                    )}
                </View>
            </View>

            {/* Footer */}
            <PracticeDocumentFooter metadata={metadata} printSettings={printSettings} variant="document" showIcons />
        </View>
    );
});
