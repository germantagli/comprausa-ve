import type { CSSProperties, ReactNode } from "react";
import { pageStyle } from "./styles";

export function PageFrame({
  children,
  style,
  wide = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  wide?: boolean;
}) {
  return (
    <main
      style={{
        ...pageStyle,
        ...(style ?? {}),
      }}
    >
      <div className="cve-page" style={wide ? { maxWidth: 1200 } : undefined}>
        {children}
      </div>
    </main>
  );
}
