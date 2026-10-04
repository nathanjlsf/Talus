import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.talus.app",
  appName: "Talus",
  webDir: "dist",
  android: {
    // Keeps location updates alive after five minutes in the background.
    useLegacyBridge: true,
  },
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
