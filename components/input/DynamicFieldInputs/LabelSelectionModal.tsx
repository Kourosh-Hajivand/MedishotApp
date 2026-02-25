import { FieldLabel } from "@/models/DynamicFieldTypes";
import colors from "@/theme/colors";
import React, { useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { BaseText } from "../../text/BaseText";

export const LabelSelectionModal = ({ visible, onClose, options, selectedLabel, onSelect }: { visible: boolean; onClose: () => void; options: FieldLabel[]; selectedLabel: FieldLabel; onSelect: (label: FieldLabel) => void }) => {
    const slideAnim = useState(new Animated.Value(0))[0];

    React.useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 150,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0], // From bottom to top
    });

    return (
        <Modal transparent visible={visible} animationType="none">
            <Pressable style={styles.backdrop} onPress={onClose} />
            <Animated.View
                style={[
                    styles.modalContainer,
                    {
                        transform: [{ translateY }],
                    },
                ]}
            >
                <BaseText type="Callout" weight="600" color="labels.primary" className="mb-4">
                    Select Label
                </BaseText>

                {options.map((option: FieldLabel, index: number) => {
                    const isSelected = option === selectedLabel;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[styles.optionButton, { backgroundColor: isSelected ? colors.system.blue + "10" : "transparent" }]}
                            onPress={() => {
                                onSelect(option as FieldLabel);
                                onClose();
                            }}
                        >
                            <BaseText type="Footnote" color={isSelected ? "system.blue" : "labels.primary"} weight={isSelected ? "500" : "400"}>
                                {option}
                            </BaseText>
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    modalContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.system.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    optionButton: {
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 6,
    },
});
