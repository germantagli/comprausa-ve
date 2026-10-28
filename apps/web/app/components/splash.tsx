"use client";

import { fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { buttonStyle, colors, secondaryButtonStyle } from "./styles";

export function Splash({
  onComenzar,
  onIniciarSesion,
  serverReachable,
}: {
  onComenzar: () => void;
  onIniciarSesion: () => void;
  serverReachable: boolean | null;
}) {
  return (
    <main
      className="cve-splash"
      style={{
        background: colors.surface,
        color: colors.text,
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
            color: colors.primary,
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
            color: colors.muted,
            fontSize: fontTokens.sizes.body,
            lineHeight: `${fontTokens.lineHeight.body}px`,
            margin: `${spaceTokens[6]}px auto 0`,
            maxWidth: 300,
          }}
        >
          Compra en USA, recíbelo en Venezuela
        </p>
        {serverReachable === false ? (
          <p
            role="status"
            style={{
              color: colors.warning,
              fontSize: fontTokens.sizes.caption,
              lineHeight: `${fontTokens.lineHeight.caption}px`,
              margin: `${spaceTokens[4]}px auto 0`,
              maxWidth: 280,
            }}
          >
            Sin conexión con el servidor. Puedes continuar; algunas acciones fallarán hasta recuperar la red.
          </p>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: spaceTokens[3], justifyItems: "stretch", paddingBottom: spaceTokens[4] }}>
        <button
          type="button"
          className="cve-fade-up"
          onClick={onComenzar}
          style={{
            ...buttonStyle,
            borderRadius: radiusTokens.md,
            fontSize: fontTokens.sizes.body,
            fontWeight: 700,
            minHeight: 52,
            width: "100%",
          }}
        >
          Comenzar
        </button>
        <button
          type="button"
          className="cve-fade-up"
          onClick={onIniciarSesion}
          style={{
            ...secondaryButtonStyle,
            borderColor: colors.primary,
            color: colors.primary,
            fontSize: fontTokens.sizes.body,
            fontWeight: 700,
            minHeight: 52,
            width: "100%",
          }}
        >
          Iniciar sesión
        </button>
      </div>
    </main>
  );
}
