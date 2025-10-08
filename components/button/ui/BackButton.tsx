import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ChevronLeftIcon } from "../../../assets/icons";
import { spacing } from "../../../styles/spaces";
import { BaseText } from "../../text/BaseText";

export const BackButton = ({ onPress }: { onPress: () => void }) => {
    return (
        <TouchableOpacity onPress={onPress} className="flex-row  items-center gap-2">
            <ChevronLeftIcon strokeWidth={0} />
            <BaseText type="Body" color="system.blue" weight={"400"}>
                Back
            </BaseText>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing["2"],
    },
});

BackButton.displayName = "BackButton";
