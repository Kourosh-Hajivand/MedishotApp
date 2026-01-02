import { BaseText } from "@/components";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { PatientDocument } from "@/utils/service/models/ResponseModels";
import { getRelativeTime } from "@/utils/helper/dateUtils";
import React from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface IDTabContentProps {
    documents: PatientDocument[];
    isLoading: boolean;
    onDocumentPress?: (document: PatientDocument) => void;
}

export const IDTabContent: React.FC<IDTabContentProps> = ({ documents, isLoading, onDocumentPress }) => {
    const renderDocumentItem = ({ item }: { item: PatientDocument }) => {
        return (
            <TouchableOpacity
                style={styles.documentItem}
                onPress={() => onDocumentPress?.(item)}
                activeOpacity={0.7}
            >
                <View style={styles.documentImageContainer}>
                    {item.image?.url ? (
                        <Image
                            source={{ uri: item.image.url }}
                            style={styles.documentImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.documentImagePlaceholder}>
                            <IconSymbol name="doc.text" color={colors.labels.tertiary} size={32} />
                        </View>
                    )}
                </View>
                <View style={styles.documentInfo}>
                    <BaseText type="Body" weight="600" color="labels.primary" style={styles.documentType}>
                        {item.type || "ID Document"}
                    </BaseText>
                    {item.description && (
                        <BaseText type="Caption1" weight="400" color="labels.secondary" style={styles.documentDescription} numberOfLines={2}>
                            {item.description}
                        </BaseText>
                    )}
                    <BaseText type="Caption1" weight="400" color="labels.tertiary" style={styles.documentDate}>
                        {getRelativeTime(item.created_at)}
                    </BaseText>
                </View>
                <IconSymbol name="chevron.right" color={colors.labels.tertiary} size={16} />
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.system.blue} />
            </View>
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <IconSymbol name="person.text.rectangle" color={colors.labels.tertiary} size={64} />
                <BaseText type="Title2" weight="600" color="labels.secondary" style={styles.emptyTitle}>
                    No ID Documents
                </BaseText>
                <BaseText type="Body" color="labels.tertiary" style={styles.emptyDescription}>
                    This patient doesn't have any ID documents yet. Tap "Add ID" to scan and upload a document.
                </BaseText>
            </View>
        );
    }

    return (
        <FlatList
            data={documents}
            renderItem={renderDocumentItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        textAlign: "center",
    },
    listContent: {
        paddingVertical: 8,
    },
    documentItem: {
        backgroundColor: colors.system.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    documentImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: "hidden",
        marginRight: 12,
        backgroundColor: colors.system.gray6,
    },
    documentImage: {
        width: "100%",
        height: "100%",
    },
    documentImagePlaceholder: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.system.gray6,
    },
    documentInfo: {
        flex: 1,
    },
    documentType: {
        fontSize: 15,
        lineHeight: 20,
        letterSpacing: -0.24,
        marginBottom: 4,
    },
    documentDescription: {
        fontSize: 13,
        lineHeight: 18,
        letterSpacing: -0.08,
        marginBottom: 4,
    },
    documentDate: {
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: -0.08,
    },
});

