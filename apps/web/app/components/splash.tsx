"use client";

import { fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import Image from "next/image";
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
        background: "#000000",
        color: colors.primaryOn,
        display: "grid",
        gridTemplateRows: "1fr auto",
        minHeight: "100dvh",
        padding: spaceTokens[6],
      }}
      aria-label={APP_BRAND_NAME}
    >
      <div style={{ alignContent: "center", justifyItems: "center", textAlign: "center" }}>
        <Image
          className="cve-splash-mark"
          src="/brand/logo.webp"
          alt={APP_BRAND_NAME}
          width={280}
          height={280}
          priority
          style={{ height: "auto", maxWidth: "min(280px, 72vw)", width: "100%" }}
        />
        <p
          className="cve-fade-up-delay"
          style={{
            color: "rgba(255,255,255,0.78)",
            fontSize: fontTokens.sizes.body,
            lineHeight: `${fontTokens.lineHeight.body}px`,
            margin: `${spaceTokens[4]}px auto 0`,
            maxWidth: 300,
          }}
        >
          Compra en USA, recíbelo en Venezuela
        </p>
        {serverReachable === false ? (
          <p
            role="status"
            style={{
              color: colors.accent,
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
            background: colors.primary,
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
            background: "transparent",
            borderColor: colors.accent,
            color: colors.accent,
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
