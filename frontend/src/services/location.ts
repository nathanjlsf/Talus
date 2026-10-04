import { Capacitor, registerPlugin } from "@capacitor/core"
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation"

const BackgroundGeolocation =
  registerPlugin<BackgroundGeolocationPlugin>(
    "BackgroundGeolocation"
  )

export interface LivePoint {
  recorded_at: string
  latitude: number
  longitude: number
  accuracy: number | null
}

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export async function readCurrentPosition(): Promise<LivePoint> {
  if (!navigator.geolocation) {
    throw new Error("This browser can't read your location.")
  }

  const position = await new Promise<GeolocationPosition>(
    (resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000,
      })
    }
  )

  return {
    recorded_at: new Date(position.timestamp).toISOString(),
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  }
}

export async function watchHikePosition(
  onPoint: (point: LivePoint) => void,
  onError: (message: string) => void
): Promise<() => void> {
  if (Capacitor.isNativePlatform()) {
    const watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "Talus is recording your hike.",
        backgroundTitle: "Recording hike",
        requestPermissions: true,
        stale: false,
        distanceFilter: 5,
      },
      (location, error) => {
        if (error) {
          onError(
            error.code === "NOT_AUTHORIZED"
              ? "Talus needs location permission to keep recording."
              : "Location failed while recording."
          )
          return
        }

        if (!location) {
          return
        }

        onPoint({
          recorded_at: new Date(
            location.time ?? Date.now()
          ).toISOString(),
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        })
      }
    )

    return () => {
      void BackgroundGeolocation.removeWatcher({
        id: watcherId,
      })
    }
  }

  if (!navigator.geolocation) {
    onError("This browser can't read your location.")
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPoint({
        recorded_at: new Date(position.timestamp).toISOString(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })
    },
    () => {
      onError(
        "Talus needs location permission to record a hike."
      )
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 20000,
    }
  )

  return () => {
    navigator.geolocation.clearWatch(watchId)
  }
}
