const { withXcodeProject } = require("@expo/config-plugins");

/**
 * Expo config plugin to ensure CODE_SIGN_ALLOW_ENTITLEMENTS_MODIFICATION is set to YES
 * This fixes the build error: "Entitlements file was modified during the build"
 */
const withCodeSignEntitlements = (config) => {
    return withXcodeProject(config, async (config) => {
        const xcodeProject = config.modResults;
        const configurations = xcodeProject.pbxXCBuildConfigurationSection();

        // Set CODE_SIGN_ALLOW_ENTITLEMENTS_MODIFICATION = YES for all build configurations
        Object.keys(configurations).forEach((configId) => {
            const buildSettings = configurations[configId].buildSettings;
            if (buildSettings) {
                buildSettings.CODE_SIGN_ALLOW_ENTITLEMENTS_MODIFICATION = "YES";
            }
        });

        return config;
    });
};

module.exports = withCodeSignEntitlements;
