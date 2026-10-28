/**
 * Original TraeLo tokens.
 * Light values are the active scheme. Dark values are prepared and not applied.
 * Cyan is an accent, not body text on light backgrounds (fails WCAG 2.2 AA).
 */
export const colorTokens = {
  light: {
    primary: "#1B5FC7",
    primaryOn: "#FFFFFF",
    deep: "#0D3A7A",
    /** Orange from TraeLo wordmark ("Lo") and smile curve. */
    accent: "#F7931E",
    accentOn: "#14243B",
    cyan: "#16B8D5",
    background: "#F3F7FC",
    surface: "#FFFFFF",
    text: "#14243B",
    muted: "#5B6B82",
    border: "#D7E0EC",
    success: "#16865D",
    successOn: "#FFFFFF",
    error: "#D92D20",
    errorOn: "#FFFFFF",
    warning: "#C45C16",
  },
  dark: {
    primary: "#3B7DE0",
    primaryOn: "#FFFFFF",
    deep: "#D6E4FF",
    accent: "#F7931E",
    accentOn: "#14243B",
    cyan: "#16B8D5",
    background: "#0B1220",
    surface: "#14243B",
    text: "#F3F7FC",
    muted: "#A8B4C7",
    border: "#2A3A55",
    success: "#16865D",
    successOn: "#FFFFFF",
    error: "#D92D20",
    errorOn: "#FFFFFF",
    warning: "#E08A45",
  },
} as const;

export const activeColorScheme = "light" as const;

export const fontTokens = {
  family: "Inter, system-ui, sans-serif",
  license: "SIL Open Font License 1.1",
  source: "https://github.com/rsms/inter",
  sizes: {
    caption: 12,
    body: 16,
    title: 22,
    display: 32,
  },
  lineHeight: {
    caption: 16,
    body: 24,
    title: 28,
    display: 40,
  },
} as const;

export const spaceTokens = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const radiusTokens = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const elevationTokens = {
  none: "none",
  sm: "0 1px 2px rgba(20, 36, 59, 0.08)",
  md: "0 8px 24px rgba(20, 36, 59, 0.08)",
} as const;

export const iconography = {
  library: "lucide",
  license: "ISC",
  source: "https://lucide.dev/license",
} as const;
