import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Flips",
  slug: "xrbl9oijjxu6ij41g3klq",
  version: "0.000.00.001",
  sdkVersion: "54.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "rork-app",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    buildNumber: "1",
    bundleIdentifier: "app.rork.xrbl9oijjxu6ij41g3klq",
    infoPlist: {
      NSCameraUsageDescription:
        "Flips needs camera access to scan items, products, and receipts for price analysis and resale insights.",
      NSPhotoLibraryUsageDescription:
        "Flips needs photo library access to select images of items, products, and deals for scanning.",
      NSLocationWhenInUseUsageDescription:
        "Flips uses your location to find nearby stores and deals in your area.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "app.rork.xrbl9oijjxu6ij41g3klq",
  },
  web: {
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        origin: "https://rork.com/",
      },
    ],
    "expo-web-browser",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Flips needs photo library access to select images of items, products, and deals for scanning.",
        cameraPermission:
          "Flips needs camera access to scan items, products, and receipts for price analysis and resale insights.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
