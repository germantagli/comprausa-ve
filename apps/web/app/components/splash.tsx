"use client";

import { fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { colors, pageStyle } from "./styles";

export function Splash({ onComenzar }: { onComenzar: () => void }) {
  return (
    <main
      className="cve-splash"
      style={{
        ...pageStyle,
        background: `linear-gradient(165deg, ${colors.deep} 0%, ${colors.primary} 55%, #0d6aa8 100%)`,
        color: colors.primaryOn,
        display: "grid",
        gridTemplateRows: "1fr auto",
        minHeight: "100dvh",
        padding: spaceTokens[6],
      }}
      aria-label="CompraUSA"
    >
      <div style={{ alignContent: "center", textAlign: "center" }}>
        <p
          className="cve-splash-mark"
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          CompraUSA
        </p>
        <p
          className="cve-fade-up-delay"
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
        <p
          className="cve-fade-up-delay"
          style={{
            fontSize: fontTokens.sizes.body,
            lineHeight: `${fontTokens.lineHeight.body}px`,
            margin: `${spaceTokens[6]}px auto 0`,
            maxWidth: 280,
            opacity: 0.95,
          }}
        >
          Compra en tiendas de USA y recíbelo en Venezuela.
        </p>
      </div>

      <div style={{ display: "grid", gap: spaceTokens[3], justifyItems: "stretch", paddingBottom: spaceTokens[4] }}>
        <button
          type="button"
          className="cve-fade-up"
          onClick={onComenzar}
          style={{
            background: colors.surface,
            border: "none",
            borderRadius: radiusTokens.md,
            color: colors.primary,
            cursor: "pointer",
            font: "inherit",
            fontSize: fontTokens.sizes.body,
            fontWeight: 700,
            minHeight: 52,
            padding: `0 ${spaceTokens[4]}px`,
            width: "100%",
          }}
        >
          Comenzar
        </button>
        <p
          style={{
            fontSize: fontTokens.sizes.caption,
            lineHeight: `${fontTokens.lineHeight.caption}px`,
            margin: 0,
            opacity: 0.85,
            textAlign: "center",
          }}
        >
          Siguiente: registro y código de un solo uso.
        </p>
      </div>
    </main>
  );
}
