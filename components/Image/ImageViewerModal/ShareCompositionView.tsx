import type { PracticeSettings } from "@/components";
import { PracticeDocumentFooter, PracticeDocumentHeader } from "@/components";
import colors from "@/theme/colors";
import type { People, Practice } from "@/utils/service/models/ResponseModels";
import React from "react";
import { Image as RNImage, View } from "react-native";
import ViewShot from "react-native-view-shot";

export interface ShareCompositionMetadata {
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    print_settings?: PracticeSettings;
}

export interface ShareCompositionViewProps {
    visible: boolean;
    width: number;
    practice: Practice | undefined;
    metadata: ShareCompositionMetadata | null | undefined;
    shareCompositionImageUri: string | null;
    shareCompositionDimensions: { width: number; height: number } | null;
    shareViewRef: React.RefObject<ViewShot | null>;
    printSettings: PracticeSettings;
    doctor: People | null;
    me: People | undefined;
    onImageLoad: () => void;
}

export const ShareCompositionView = React.memo<ShareCompositionViewProps>(function ShareCompositionView({
    visible,
    width,
    practice,
    metadata,
    shareCompositionImageUri,
    shareCompositionDimensions,
    shareViewRef,
    printSettings,
    doctor,
    me,
    onImageLoad,
}) {
    if (!visible || !practice || !metadata || !shareCompositionImageUri || !shareCompositionDimensions) {
        return null;
    }

    return (
        <View
            style={{
                position: "absolute",
                left: -width * 2,
                top: 0,
                width: width,
                overflow: "hidden",
                backgroundColor: colors.system.white,
            }}
            pointerEvents="none"
            collapsable={false}
        >
            <ViewShot ref={shareViewRef} style={{ width: width, backgroundColor: colors.system.white }}>
                <View style={{ width: width, paddingHorizontal: 16, paddingTop: 16 }}>
                    <PracticeDocumentHeader practice={practice} printSettings={printSettings} doctor={doctor ?? null} me={me ?? undefined} variant="document" />
                </View>
                <View
                    style={{
                        width: width,
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        backgroundColor: colors.system.white,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            width: width - 32,
                            height: (width - 32) * (shareCompositionDimensions.height / shareCompositionDimensions.width),
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <RNImage
                            source={{ uri: shareCompositionImageUri }}
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                            resizeMode="contain"
                            onLoad={onImageLoad}
                            onError={() => {
                                console.error("Failed to load share composition image");
                                onImageLoad();
                            }}
                        />
                    </View>
                </View>
                <View style={{ width: width, paddingHorizontal: 16, paddingBottom: 16 }}>
                    <PracticeDocumentFooter metadata={metadata} printSettings={printSettings} variant="document" />
                </View>
            </ViewShot>
        </View>
    );
});
