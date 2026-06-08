import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.z1insights.app",
  appName: "Z1 INSIGHTS",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: {
    contentInset: "always",
    backgroundColor: "#0A0A0B",
  },
  android: {
    backgroundColor: "#0A0A0B",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0A0A0B",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0A0A0B",
      overlaysWebView: false,
    },
  },
  server: {
    // For live-reload during development, point this to your Lovable preview URL:
    // url: "https://id-preview--2880499c-4e1a-4476-b216-5f3989626207.lovable.app?forceHideBadge=true",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;