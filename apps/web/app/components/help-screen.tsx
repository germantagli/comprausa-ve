"use client";

import { useReplayOnboarding } from "./client-shell";
import { bodyStyle, buttonStyle, pageStyle, titleStyle } from "./styles";

export function HelpScreen() {
  const replay = useReplayOnboarding();
  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>Ayuda</h1>
      <p style={bodyStyle}>Puedes volver a ver la introducción de tres pasos.</p>
      <button type="button" style={buttonStyle} onClick={replay}>
        Ver la introducción de nuevo
      </button>
      <p style={bodyStyle}>Espacio para un video externo. No hay uno cargado.</p>
    </main>
  );
}
