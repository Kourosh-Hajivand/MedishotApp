import { Stack } from "expo-router";
import React from "react";

export default function AlbumLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerTitle: "Practice Album",
                    headerLargeTitle: false,
                    headerTransparent: true,
                    headerShadowVisible: true,
                    // headerRight: () => (
                    //     <Host style={{ width: 30, height: 50 }}>
                    //         <TouchableOpacity
                    //             onPress={() => {
                    //                 // Add right button action if needed
                    //             }}
                    //             className="flex-row px-2 justify-center items-center"
                    //         >
                    //             <IconSymbol name="ellipsis.circle" size={20} color={colors.system.blue} />
                    //         </TouchableOpacity>
                    //     </Host>
                    // ),
                }}
            />
        </Stack>
    );
}
