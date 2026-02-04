import { ChevronRightIcon } from "@/assets/icons";
import { Address, DynamicFieldItem, DynamicInputListProps, FieldLabel } from "@/models/DynamicFieldTypes";
import { DynamicFieldType } from "@/models/enums";
import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { router, useFocusEffect, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutAnimation, Platform, StyleSheet, TouchableOpacity, UIManager, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, FadeOutUp, Layout } from "react-native-reanimated";
import { AddressInput, EmailInput, PhoneNumberInput, TextFieldInput, URLInput } from "./input/DynamicFieldInputs";
import { LabelSelectionModal } from "./input/DynamicFieldInputs/LabelSelectionModal";
import { BaseText } from "./text/BaseText";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const DynamicInputList: React.FC<DynamicInputListProps & { paramKey: string }> = ({ config, onChange, initialItems = [], paramKey, error }) => {
    const [items, setItems] = useState<DynamicFieldItem[]>(initialItems);
    const isInitializedRef = useRef(false);

    useEffect(() => {
        if (initialItems.length > 0 && !isInitializedRef.current) {
            setItems(initialItems);
            isInitializedRef.current = true;
        }
    }, [initialItems]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [visible, setVisible] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState<FieldLabel>(config.labelOptions[0]);

    const {
        selected,
        paramKey: returnedKey,
        type,
    } = useGlobalSearchParams<{
        selected?: string;
        paramKey?: string;
        type?: "label" | "country";
    }>();

    useFocusEffect(
        React.useCallback(() => {
            if (!selected || !returnedKey || !type) return;

            setItems((prev) =>
                prev.map((item) => {
                    if (type === "country" && config.fieldType === DynamicFieldType.Address && item.id === returnedKey && typeof item.value === "object" && "country" in item.value) {
                        const addr = item.value as Address;
                        return { ...item, value: { ...addr, country: selected } };
                    }

                    if (type === "label" && item.id === returnedKey) {
                        return { ...item, label: selected };
                    }

                    return item;
                }),
            );
        }, [selected, returnedKey, type]),
    );

    useEffect(() => {
        onChange?.(items);
    }, [items]);

    const addItem = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newItem: DynamicFieldItem = {
            id: Date.now().toString(),
            label: config.labelOptions[0],
            value: config.fieldType === DynamicFieldType.Address ? { street1: "", street2: "", city: "", state: "", zip: "", country: "United States" } : "",
        };
        setItems((prev) => [...prev, newItem]);
    };

    const removeItem = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateValue = (id: string, value: string | Address) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
    };

    const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />, []);

    const renderInputByType = (item: DynamicFieldItem) => {
        const stringValue = typeof item.value === "string" ? item.value : "";
        const commonProps = {
            value: stringValue,
            onChangeText: (text: string) => updateValue(item.id, text),
            placeholder: config.placeholder || config.fieldTitle,
        };

        switch (config.fieldType) {
            case DynamicFieldType.Phone:
                return <PhoneNumberInput {...commonProps} />;
            case DynamicFieldType.Email:
                return <EmailInput {...commonProps} />;
            case DynamicFieldType.URL:
                return <URLInput {...commonProps} />;
            case DynamicFieldType.Address:
                return <AddressInput fieldId={item.id} value={typeof item.value === "object" ? item.value : { street1: "", street2: "", city: "", state: "", zip: "", country: "United States" }} onChange={(address) => updateValue(item.id, address)} />;
            case DynamicFieldType.Number:
                return <TextFieldInput {...commonProps} keyboardType="numeric" />;
            default:
                return <TextFieldInput {...commonProps} />;
        }
    };

    return (
        <>
            <View className="w-full">
                {items.map((item, index) => (
                    <AnimatedTouchableOpacity
                        key={item.id}
                        entering={FadeInDown.springify().damping(0).stiffness(900)}
                        exiting={index === 0 ? FadeOutDown.springify().damping(0).stiffness(900) : FadeOutUp.springify().damping(0).stiffness(900)}
                        layout={Layout.springify().damping(0).stiffness(900)}
                        activeOpacity={1}
                        style={[
                            styles.itemContainer,
                            {
                                borderTopLeftRadius: index === 0 ? 20 : 0,
                                borderTopRightRadius: index === 0 ? 20 : 0,
                                borderBottomColor: colors.system.gray5,
                            },
                        ]}
                    >
                        <TouchableOpacity onPress={() => removeItem(item.id)} className="bg-system-red rounded-full w-6 h-6 flex flex-row items-center justify-center" activeOpacity={0.7}>
                            <BaseText type="Subhead" color="system.white">
                                −
                            </BaseText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center gap-1"
                            onPress={() => {
                                setSelectedIndex(index);
                                router.push({
                                    pathname: "/(modals)/add-patient/select-label",
                                    params: {
                                        options: JSON.stringify(config.labelOptions),
                                        selected: item.label,
                                        paramKey: item.id,
                                        type: "label",
                                    },
                                });
                                setVisible(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <BaseText type="Subhead" color="system.blue">
                                {item.label}
                            </BaseText>
                            <ChevronRightIcon width={12} height={12} />
                        </TouchableOpacity>

                        {renderInputByType(item)}
                    </AnimatedTouchableOpacity>
                ))}

                <AnimatedTouchableOpacity
                    onPress={addItem}
                    layout={Layout.springify().damping(0).stiffness(900)}
                    activeOpacity={0.7}
                    style={[
                        styles.addButton,
                        {
                            borderTopLeftRadius: items.length > 0 ? 0 : 99,
                            borderTopRightRadius: items.length > 0 ? 0 : 99,
                            borderBottomLeftRadius: items.length > 0 ? 20 : 99,
                            borderBottomRightRadius: items.length > 0 ? 20 : 99,
                        },
                    ]}
                >
                    <View className="bg-system-green rounded-full w-6 h-6 flex flex-row items-center justify-center">
                        <BaseText type="Subhead" color="system.white">
                            ＋
                        </BaseText>
                    </View>
                    <BaseText type="Subhead" weight={"400"} color="labels.primary">
                        add {config.fieldTitle}
                    </BaseText>
                </AnimatedTouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <BaseText type="Footnote" color="system.red">
                        {error}
                    </BaseText>
                </View>
            )}

            <LabelSelectionModal visible={visible} onClose={() => setVisible(false)} options={config.labelOptions} selectedLabel={selectedLabel as FieldLabel} onSelect={(label) => setSelectedLabel(label as FieldLabel)} />
        </>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.system.white,
        paddingHorizontal: spacing["4"],
        paddingVertical: spacing["0"],
        gap: spacing["4"],
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.system.white,
        paddingHorizontal: spacing["4"],
        paddingVertical: spacing["4"],
        gap: spacing["4"],
    },
    errorContainer: {
        paddingHorizontal: spacing["3"],
        paddingTop: spacing["0"],
        paddingBottom: spacing["0"],
    },
});
