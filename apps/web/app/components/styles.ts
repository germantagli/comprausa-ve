import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";

export const colors = colorTokens.light;

export const pageStyle = {
  background: colors.background,
  color: colors.text,
  fontFamily: fontTokens.family,
  fontSize: fontTokens.sizes.body,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: 0,
  minHeight: "100vh",
  padding: `${spaceTokens[6]}px ${spaceTokens[4]}px ${spaceTokens[12] + spaceTokens[8]}px`,
} as const;

export const titleStyle = {
  fontSize: fontTokens.sizes.title,
  lineHeight: `${fontTokens.lineHeight.title}px`,
  margin: `0 0 ${spaceTokens[2]}px`,
} as const;

export const wordmarkStyle = {
  color: colors.deep,
  fontSize: fontTokens.sizes.caption,
  letterSpacing: "0.04em",
  lineHeight: `${fontTokens.lineHeight.caption}px`,
  margin: `0 0 ${spaceTokens[2]}px`,
  textDecoration: "none",
} as const;

export const sectionStyle = {
  marginTop: spaceTokens[6],
} as const;

export const headingStyle = {
  fontSize: fontTokens.sizes.body,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: `0 0 ${spaceTokens[3]}px`,
} as const;

export const bodyStyle = { margin: `0 0 ${spaceTokens[3]}px` } as const;

export const buttonStyle = {
  background: colors.primary,
  border: "none",
  borderRadius: radiusTokens.md,
  color: colors.primaryOn,
  cursor: "pointer",
  font: "inherit",
  minHeight: 44,
  padding: `0 ${spaceTokens[4]}px`,
} as const;

export const secondaryButtonStyle = {
  background: colors.surface,
  border: `1px solid ${colors.deep}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  cursor: "pointer",
  font: "inherit",
  minHeight: 44,
  padding: `0 ${spaceTokens[4]}px`,
} as const;

export const inputStyle = {
  background: colors.surface,
  border: `1px solid ${colors.deep}`,
  borderRadius: radiusTokens.sm,
  color: colors.text,
  font: "inherit",
  minHeight: 44,
  padding: `0 ${spaceTokens[3]}px`,
  width: "100%",
} as const;

export const cardStyle = {
  background: colors.surface,
  borderRadius: radiusTokens.md,
  boxShadow: "0 1px 2px rgba(20, 36, 59, 0.08)",
  display: "grid",
  gap: spaceTokens[2],
  marginBottom: spaceTokens[3],
  padding: spaceTokens[4],
} as const;

export const errorStyle = { color: colors.error, margin: `${spaceTokens[3]}px 0` } as const;

export const bannerStyle = {
  background: colors.deep,
  borderRadius: radiusTokens.lg,
  color: colors.primaryOn,
  marginTop: spaceTokens[6],
  padding: spaceTokens[4],
} as const;

export const rowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: spaceTokens[3],
  marginTop: spaceTokens[4],
} as const;

export const linkStyle = {
  color: colors.primary,
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
} as const;
