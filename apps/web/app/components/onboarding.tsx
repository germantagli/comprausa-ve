"use client";

import { onboardingSteps } from "@comprausa/types";
import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { useState } from "react";
import { IconBox } from "./icons";
import {
  bannerStyle,
  buttonStyle,
  colors,
  pageStyle,
  rowStyle,
  secondaryButtonStyle,
  titleStyle,
  wordmarkStyle,
} from "./styles";

export function Onboarding({ onDone, videoUrl }: { onDone: () => void; videoUrl?: string }) {
  const [step, setStep] = useState(0);
  const text = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;

  return (
    <main style={{ ...pageStyle, display: "grid", placeItems: "center" }}>
      <div className="cve-page" style={{ maxWidth: 520, width: "100%" }}>
        <p style={wordmarkStyle}>CompraUSA VE</p>
        <p style={{ margin: `${spaceTokens[4]}px 0 ${spaceTokens[2]}px`, color: colors.muted }}>
          Paso {step + 1} de {onboardingSteps.length}
        </p>
        <h1 style={titleStyle}>{text}</h1>
        <div className="cve-fade-up" style={{ ...bannerStyle, marginTop: spaceTokens[4] }}>
          <div style={{ alignItems: "center", display: "flex", gap: spaceTokens[3] }}>
            <IconBox />
            <p style={{ margin: 0 }}>De tiendas de USA a tu dirección en Venezuela.</p>
          </div>
        </div>
        <VideoSlot url={videoUrl} />
        <div style={rowStyle}>
          <button type="button" style={buttonStyle} onClick={() => (last ? onDone() : setStep((current) => current + 1))}>
            Continuar
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={onDone}>
            Omitir
          </button>
        </div>
      </div>
    </main>
  );
}

function VideoSlot({ url }: { url?: string }) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        marginTop: spaceTokens[4],
        minHeight: 120,
        padding: spaceTokens[4],
      }}
    >
      <p style={{ fontSize: fontTokens.sizes.caption, lineHeight: `${fontTokens.lineHeight.caption}px`, margin: 0 }}>
        Espacio para un video externo. No hay uno cargado.
      </p>
      {url ? (
        <a href={url} style={{ color: colors.primary, display: "inline-flex", minHeight: 44, alignItems: "center" }}>
          Abrir el video
        </a>
      ) : null}
    </div>
  );
}
