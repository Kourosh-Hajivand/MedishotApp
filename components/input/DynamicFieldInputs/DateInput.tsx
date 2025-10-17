// import colors from "@/theme/colors";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import React, { useState } from "react";
// import { Platform, TextInput, TextInputProps, TouchableOpacity } from "react-native";

// interface Props extends Omit<TextInputProps, "value" | "onChangeText"> {
//     value: string;
//     onChangeText: (text: string) => void;
//     placeholder?: string;
// }

// export const DateInput: React.FC<Props> = ({ value, onChangeText, placeholder = "Date", ...props }) => {
//     const [showPicker, setShowPicker] = useState(false);
//     const [date, setDate] = useState(value ? new Date(value) : new Date());

//     const handleDateChange = (event: any, selectedDate?: Date) => {
//         setShowPicker(Platform.OS === "ios");
//         if (selectedDate) {
//             setDate(selectedDate);
//             // Format date as MM/DD/YYYY
//             const formatted = selectedDate.toLocaleDateString("en-US");
//             onChangeText(formatted);
//         }
//     };

//     return (
//         <>
//             <TouchableOpacity onPress={() => setShowPicker(true)} className="flex-1">
//                 <TextInput
//                     {...props}
//                     className="flex-1 text-base px-2"
//                     style={{
//                         paddingVertical: Platform.OS === "ios" ? 12 : 10,
//                         color: colors.text,
//                     }}
//                     placeholder={placeholder}
//                     placeholderTextColor={"rgba(60, 60, 67, 0.30)"}
//                     value={value}
//                     editable={false}
//                     pointerEvents="none"
//                 />
//             </TouchableOpacity>

//             {showPicker && <DateTimePicker value={date} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleDateChange} />}
//         </>
//     );
// };
