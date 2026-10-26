import { colorTokens, elevationTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";

export const colors = colorTokens.light;

export const pageStyle = {
  background: colors.background,
  color: colors.text,
  fontFamily: fontTokens.family,
  fontSize: fontTokens.sizes.body,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: 0,
  minHeight: "100vh",
} as const;

export const titleStyle = {
  fontSize: fontTokens.sizes.title,
  fontWeight: 700,
  lineHeight: `${fontTokens.lineHeight.title}px`,
  margin: `0 0 ${spaceTokens[2]}px`,
} as const;

export const displayStyle = {
  fontSize: fontTokens.sizes.display,
  fontWeight: 700,
  lineHeight: `${fontTokens.lineHeight.display}px`,
  margin: `0 0 ${spaceTokens[3]}px`,
} as const;

export const wordmarkStyle = {
  color: colors.deep,
  fontSize: fontTokens.sizes.title,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: `${fontTokens.lineHeight.title}px`,
  margin: 0,
  textDecoration: "none",
} as const;

export const sectionStyle = {
  marginTop: spaceTokens[6],
} as const;

export const headingStyle = {
  fontSize: fontTokens.sizes.body,
  fontWeight: 700,
  lineHeight: `${fontTokens.lineHeight.body}px`,
  margin: `0 0 ${spaceTokens[3]}px`,
} as const;

export const bodyStyle = { color: colors.text, margin: `0 0 ${spaceTokens[3]}px` } as const;

export const mutedStyle = {
  color: colors.muted,
  fontSize: fontTokens.sizes.caption,
  lineHeight: `${fontTokens.lineHeight.caption}px`,
  margin: `0 0 ${spaceTokens[3]}px`,
} as const;

export const buttonStyle = {
  background: colors.primary,
  border: "none",
  borderRadius: radiusTokens.md,
  color: colors.primaryOn,
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  minHeight: 44,
  padding: `0 ${spaceTokens[4]}px`,
} as const;

export const secondaryButtonStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  cursor: "pointer",
  font: "inherit",
  fontWeight: 600,
  minHeight: 44,
  padding: `0 ${spaceTokens[4]}px`,
} as const;

export const inputStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.sm,
  color: colors.text,
  font: "inherit",
  minHeight: 44,
  padding: `0 ${spaceTokens[3]}px`,
  width: "100%",
} as const;

export const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  boxShadow: elevationTokens.sm,
  display: "grid",
  gap: spaceTokens[2],
  marginBottom: 0,
  padding: spaceTokens[4],
} as const;

export const errorStyle = { color: colors.error, margin: `${spaceTokens[3]}px 0` } as const;

export const bannerStyle = {
  background: `linear-gradient(135deg, ${colors.deep} 0%, ${colors.primary} 62%, ${colors.cyan} 140%)`,
  borderRadius: radiusTokens.lg,
  color: colors.primaryOn,
  marginTop: spaceTokens[6],
  overflow: "hidden",
  padding: spaceTokens[6],
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
  textDecoration: "none",
} as const;

export const badgeStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.sm,
  color: colors.deep,
  display: "inline-block",
  fontSize: fontTokens.sizes.caption,
  fontWeight: 600,
  lineHeight: `${fontTokens.lineHeight.caption}px`,
  padding: `2px ${spaceTokens[2]}px`,
} as const;

export const chipStyle = {
  alignItems: "center",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  display: "inline-flex",
  fontSize: fontTokens.sizes.caption,
  fontWeight: 600,
  justifyContent: "center",
  minHeight: 44,
  padding: `0 ${spaceTokens[3]}px`,
} as const;

export const summaryBoxStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.lg,
  boxShadow: elevationTokens.md,
  display: "grid",
  gap: spaceTokens[3],
  padding: spaceTokens[4],
} as const;

export { elevationTokens, fontTokens, radiusTokens, spaceTokens };
