module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            [
                "babel-preset-expo",
                {
                    jsxImportSource: "react-native-css-interop/jsx-runtime",
                },
            ],
            "nativewind/babel",
        ],
        plugins: [
            [
                "module-resolver",
                {
                    root: ["./"],
                    alias: {
                        "@": "./",
                    },
                    extensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".jpg", ".png", ".jpeg"],
                },
            ],
            "react-native-reanimated/plugin", // Must be last
        ],
    };
};
