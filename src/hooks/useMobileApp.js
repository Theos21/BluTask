// Detect Capacitor native app environment
// window.Capacitor is injected by the Capacitor bridge at runtime — it is
// NOT present in Tauri, regular browsers, or server-side rendering.
export const isCapacitor =
  typeof window !== 'undefined' &&
  !!window.Capacitor &&
  window.Capacitor.isNativePlatform?.() === true

export const capacitorPlatform = isCapacitor
  ? (window.Capacitor.getPlatform?.() ?? 'web')
  : 'web'

export const isIOS     = capacitorPlatform === 'ios'
export const isAndroid = capacitorPlatform === 'android'
