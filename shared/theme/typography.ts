/**
 * App typeface, shared by web and mobile.
 * Web loads the Inter variable font from Google Fonts (web/src/index.css);
 * mobile bundles static weights via @expo-google-fonts/inter (mobile/src/theme/fonts.ts).
 */
export const fontFamily = 'Inter'

/** CSS stack with fallbacks while the web font loads. */
export const webFontStack = `'${fontFamily}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
