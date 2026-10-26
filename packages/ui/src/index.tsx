import type { CSSProperties } from "react";
import { colorTokens, fontTokens } from "@comprausa/design-tokens";

/** Names only. These components are not implemented in this phase. */
export const plannedComponents = [
  "Button",
  "IconButton",
  "TextField",
  "PhoneField",
  "SearchField",
  "MoneyText",
  "StatusPill",
  "DemoDisclaimer",
  "QuoteLinkForm",
  "OrderTimeline",
  "PaymentInstructions",
  "ProofUpload",
  "PaymentStatus",
  "AppHeader",
  "BottomTabBar",
  "EmptyState",
  "ErrorState",
  "LoadingSkeleton",
  "Dialog",
  "Toast",
  "AddressForm",
] as const;

export function PhaseNotice({ title }: { title: string }) {
  const style: CSSProperties = {
    color: colorTokens.light.text,
    background: colorTokens.light.background,
    fontFamily: fontTokens.family,
    margin: 0,
  };
  return <p style={style}>{title}</p>;
}
