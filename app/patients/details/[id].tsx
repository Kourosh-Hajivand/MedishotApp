import { BaseButton, BaseText } from "@/components";
import Avatar from "@/components/avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "@/theme/colors";
import { useLocalSearchParams } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PatientDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const safeAreaInsets = useSafeAreaInsets();
    return (
        <ScrollView contentContainerClassName="flex-1  gap-4" style={{ paddingTop: safeAreaInsets.top + 45, flex: 1 }}>
            <View className="items-center justify-center gap-2">
                <Avatar name="John Doe" size={100} haveRing />
                <View className="items-center justify-center ">
                    <BaseText type="Title1" weight={600} color="labels.primary">
                        John Doe
                    </BaseText>
                    <BaseText type="Callout" weight={400} color="labels.secondary">
                        last update: yesterday
                    </BaseText>
                </View>
            </View>
            <View className="gap-5 px-5">
                <View className="w-full h-[76px] bg-white rounded-xl flex-row">
                    <TouchableOpacity onPress={() => {}} className="w-full flex-1 items-center justify-center gap-2 border-r-[0.8px] border-border">
                        <IconSymbol name="camera" color={colors.system.blue} size={26} />
                        <BaseText type="Footnote" weight={400} color="labels.primary">
                            Take photo
                        </BaseText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {}} className="w-full flex-1 items-center justify-center gap-2 border-r-[0.8px] border-border">
                        <IconSymbol name="checklist" color={colors.system.blue} size={26} />
                        <BaseText type="Footnote" weight={400} color="labels.primary">
                            Fill consent
                        </BaseText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {}} className="w-full flex-1 items-center justify-center gap-2">
                        <IconSymbol name="person.text.rectangle" color={colors.system.blue} size={26} />
                        <BaseText type="Footnote" weight={400} color="labels.primary">
                            Add ID
                        </BaseText>
                    </TouchableOpacity>
                </View>
                <View className="bg-white py-2 px-4 rounded-xl">
                    <View className="flex-row items-center justify-between pb-2 border-b border-border">
                        <View>
                            <BaseText type="Subhead" weight={400} color="labels.secondary">
                                Phone
                            </BaseText>
                            <BaseText type="Subhead" weight={400} color="labels.primary">
                                +1 (232) 148-8254
                            </BaseText>
                        </View>
                        <View className="gap-3 flex-row">
                            <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="message.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} />
                            <BaseButton ButtonStyle="Tinted" noText leftIcon={<IconSymbol name="phone.fill" color={colors.system.blue} size={16} />} style={{ width: 30, height: 30 }} />
                        </View>
                    </View>
                    <View className="gap-2 flex-row pt-2">
                        <View className="flex-1 border-r border-border">
                            <BaseText type="Subhead" weight={400} color="labels.secondary">
                                asigned to:
                            </BaseText>
                            <BaseText type="Subhead" weight={400} color="labels.primary">
                                Dr. Bahrami
                            </BaseText>
                        </View>
                        <View className="flex-1">
                            <BaseText type="Subhead" weight={400} color="labels.secondary">
                                chart number:
                            </BaseText>
                            <BaseText type="Subhead" weight={400} color="labels.primary">
                                #23122
                            </BaseText>
                        </View>
                    </View>
                </View>

                <TouchableOpacity onPress={() => {}} className="bg-white py-2 px-4 flex-row items-center justify-between rounded-xl">
                    <BaseText type="Subhead" weight={400} color="labels.primary">
                        Patient Details
                    </BaseText>
                    <IconSymbol name="chevron.right" color={colors["text-secondary"]} size={16} />
                </TouchableOpacity>
            </View>
            <View className="flex-1 bg-white"></View>
        </ScrollView>
    );
}
