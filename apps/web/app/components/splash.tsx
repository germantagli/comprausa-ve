"use client";

import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { colors, pageStyle } from "./styles";

export function Splash() {
  return (
    <main
      className="cve-splash"
      style={{
        ...pageStyle,
        alignItems: "center",
        background: `linear-gradient(165deg, ${colors.deep} 0%, ${colors.primary} 55%, #0d6aa8 100%)`,
        color: colors.primaryOn,
        display: "grid",
        placeItems: "center",
      }}
      aria-busy="true"
      aria-label="CompraUSA"
    >
      <div style={{ padding: spaceTokens[6], textAlign: "center" }}>
        <p
          className="cve-splash-mark"
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          CompraUSA
        </p>
        <p
          style={{
            fontSize: fontTokens.sizes.caption,
            letterSpacing: "0.08em",
            margin: `${spaceTokens[3]}px 0 0`,
            opacity: 0.9,
            textTransform: "uppercase",
          }}
        >
          VE · USA → Venezuela
        </p>
      </div>
    </main>
  );
}
