"use client";

import { useReplayOnboarding } from "./client-shell";
import { PageFrame } from "./page-frame";
import { bodyStyle, buttonStyle, cardStyle, mutedStyle, titleStyle } from "./styles";

export function HelpScreen() {
  const replay = useReplayOnboarding();
  return (
    <PageFrame>
      <h1 style={titleStyle}>Ayuda</h1>
      <div style={cardStyle}>
        <p style={bodyStyle}>Puedes volver a ver la introducción de tres pasos.</p>
        <button type="button" style={buttonStyle} onClick={replay}>
          Ver la introducción de nuevo
        </button>
        <p style={mutedStyle}>Espacio para un video externo. No hay uno cargado.</p>
      </div>
    </PageFrame>
  );
}
