"use client";

import { onboardingSteps } from "@comprausa/types";
import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { useState } from "react";
import { buttonStyle, colors, pageStyle, rowStyle, secondaryButtonStyle, titleStyle } from "./styles";

export function Onboarding({ onDone, videoUrl }: { onDone: () => void; videoUrl?: string }) {
  const [step, setStep] = useState(0);
  const text = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;

  return (
    <main style={pageStyle}>
      <p style={{ margin: 0, color: colors.deep }}>CompraUSA VE</p>
      <p style={{ margin: `${spaceTokens[4]}px 0 ${spaceTokens[2]}px` }}>Paso {step + 1} de {onboardingSteps.length}</p>
      <h1 style={titleStyle}>{text}</h1>
      <VideoSlot url={videoUrl} />
      <div style={rowStyle}>
        <button type="button" style={buttonStyle} onClick={() => (last ? onDone() : setStep((current) => current + 1))}>
          Continuar
        </button>
        <button type="button" style={secondaryButtonStyle} onClick={onDone}>
          Omitir
        </button>
      </div>
    </main>
  );
}

function VideoSlot({ url }: { url?: string }) {
  return (
    <div
      style={{
        background: colors.surface,
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
