import { spacing } from "@/styles/spaces";
import colors from "@/theme/colors";
import { DateTimePicker, Host } from "@expo/ui/swift-ui";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useRef, useState } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import BaseButton from "../button/BaseButton";
import { BaseText } from "../text/BaseText";

interface PickerInputProps<T extends FieldValues> {
    control: any;
    name: keyof T;
    label: string;
    type: "date" | "gender";
    placeholder?: string;
    error?: string;
    noBorder?: boolean;
}

export function ControlledPickerInput<T extends FieldValues>({ control, name, label, type, placeholder, error, noBorder = false }: PickerInputProps<T>) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const genders = ["Male", "Female", "Other"];

    const openSheet = () => {
        bottomSheetRef.current?.present();
    };

    const closeSheet = () => {
        bottomSheetRef.current?.dismiss();
    };

    // تاریخ به فرمت خوانا برای کاربر
    const formatDateDisplay = (dateString?: string) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <Controller
            control={control}
            name={name as string}
            render={({ field: { onChange, value } }) => (
                <>
                    {/* دکمه ورودی */}
                    <TouchableOpacity
                        onPress={openSheet}
                        activeOpacity={0.7}
                        style={[
                            styles.inputContainer,
                            {
                                borderColor: error ? colors.system.red : colors.border,
                                borderWidth: noBorder ? 0 : 1,
                            },
                        ]}
                    >
                        <BaseText type="Body" color={value ? "labels.primary" : "labels.tertiary"}>
                            {value ? (type === "date" ? formatDateDisplay(value) : value) : placeholder || label}
                        </BaseText>
                    </TouchableOpacity>

                    {/* خطا */}
                    {!!error && (
                        <BaseText type="Caption2" color="system.red" className="mt-1">
                            {error}
                        </BaseText>
                    )}

                    {/* Bottom Sheet */}
                    <BottomSheetModal
                        ref={bottomSheetRef}
                        enableHandlePanningGesture={type !== "date"} // ⛔ غیرفعال برای Date
                        enablePanDownToClose={type !== "date"}
                        enableDynamicSizing
                        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />}
                        backgroundStyle={styles.sheetBackground}
                        handleIndicatorStyle={{ backgroundColor: colors.system.gray3 }}
                        onDismiss={closeSheet}
                    >
                        <BottomSheetView style={[styles.sheetContent, type === "date" && { alignItems: "center", justifyContent: "center", gap: 16 }]}>
                            <BaseText type="Title3" weight="600" color="labels.primary" className="!text-start">
                                Select {label}
                            </BaseText>

                            {type === "date" ? (
                                <View style={{ width: "100%", alignItems: "center", paddingBottom: 20, gap: 10 }}>
                                    <Host style={{ width: "100%", height: 200 }}>
                                        <DateTimePicker
                                            onDateSelected={(date) => {
                                                setSelectedDate(date);
                                                onChange(date.toISOString());
                                            }}
                                            displayedComponents="date"
                                            initialDate={value || new Date().toISOString()}
                                            variant="wheel"
                                        />
                                    </Host>

                                    <BaseButton label="Done" onPress={closeSheet} ButtonStyle="Filled" size="Medium" className="!w-full" />
                                </View>
                            ) : (
                                genders.map((g, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.optionButton}
                                        onPress={() => {
                                            onChange(g);
                                            closeSheet();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <BaseText type="Body" color={value === g ? "system.blue" : "labels.primary"} weight={value === g ? "600" : "400"}>
                                            {g}
                                        </BaseText>
                                    </TouchableOpacity>
                                ))
                            )}
                        </BottomSheetView>
                    </BottomSheetModal>
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing["4"],
        justifyContent: "center",
        backgroundColor: colors.system.white,
    },
    sheetBackground: {
        backgroundColor: colors.system.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    sheetContent: {
        flex: 1,
        paddingHorizontal: spacing["5"],
        paddingVertical: spacing["4"],
    },
    doneButton: {
        marginTop: 12,
        backgroundColor: colors.system.blue,
        paddingHorizontal: 32,
        paddingVertical: 10,
        borderRadius: 12,
    },
    optionButton: {
        paddingVertical: spacing["3"],
        borderRadius: 10,
    },
});
