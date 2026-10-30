import type { CSSProperties, ReactNode } from "react";
import { pageStyle } from "./styles";

export function PageFrame({
  children,
  style,
  wide = false,
  compact = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  wide?: boolean;
  /** Tighter mobile padding for dense screens like Home. */
  compact?: boolean;
}) {
  return (
    <main
      style={{
        ...pageStyle,
        ...(style ?? {}),
      }}
    >
      <div
        className={compact ? "cve-page cve-page--compact" : "cve-page"}
        style={wide ? { maxWidth: "min(1360px, var(--cve-page-max, 1280px))" } : undefined}
      >
        {children}
      </div>
    </main>
  );
}
