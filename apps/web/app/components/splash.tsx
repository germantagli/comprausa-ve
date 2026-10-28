"use client";

import { fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME } from "@comprausa/types";
import Image from "next/image";
import { buttonStyle, colors } from "./styles";

const benefits = [
  { icon: "/brand/splash/icon-shield.webp", label: "Productos 100% originales" },
  { icon: "/brand/splash/icon-store.webp", label: "Tus tiendas favoritas de USA" },
  { icon: "/brand/splash/icon-card.webp", label: "Pagos seguros" },
  { icon: "/brand/splash/icon-truck.webp", label: "Envíos a toda Venezuela" },
] as const;

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
        background: "linear-gradient(180deg, #EAF3FF 0%, #FFFFFF 38%, #FFFFFF 100%)",
        color: colors.text,
        display: "grid",
        gridTemplateRows: "1fr auto",
        minHeight: "100dvh",
        padding: `${spaceTokens[6]}px ${spaceTokens[4]}px ${spaceTokens[6]}px`,
      }}
      aria-label={APP_BRAND_NAME}
    >
      <div style={{ display: "grid", gap: spaceTokens[4], alignContent: "start" }}>
        <header style={{ alignItems: "center", display: "grid", gap: spaceTokens[3], justifyItems: "center", textAlign: "center" }}>
          <div className="cve-splash-mark" style={{ alignItems: "center", display: "flex", gap: spaceTokens[2] }}>
            <Image
              src="/brand/splash/cart.webp"
              alt=""
              width={56}
              height={44}
              priority
              style={{ height: 44, width: "auto" }}
            />
            <p style={{ margin: 0, lineHeight: 1 }}>
              <span style={{ color: colors.primary, fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>Trae</span>
              <span style={{ color: colors.accent, fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>Lo</span>
            </p>
          </div>
          <h1
            style={{
              color: colors.deep,
              fontSize: "clamp(26px, 7vw, 32px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Compra en USA
            <br />
            Recíbelo en Venezuela
          </h1>
        </header>

        <div
          aria-hidden="true"
          className="cve-splash-hero"
          style={{
            margin: "0 auto",
            maxWidth: 420,
            position: "relative",
            width: "100%",
          }}
        >
          <Image
            src="/brand/splash/hero-collage.webp"
            alt=""
            width={920}
            height={668}
            priority
            style={{ display: "block", height: "auto", width: "100%" }}
          />
        </div>

        <ul
          className="cve-fade-up"
          style={{ display: "grid", gap: spaceTokens[3], listStyle: "none", margin: `${spaceTokens[2]}px 0 0`, padding: 0 }}
        >
          {benefits.map((item) => (
            <li key={item.label} style={{ alignItems: "center", display: "flex", gap: spaceTokens[3] }}>
              <Image src={item.icon} alt="" width={36} height={36} unoptimized style={{ height: 36, width: 36 }} />
              <span
                style={{
                  color: colors.deep,
                  fontSize: fontTokens.sizes.body,
                  fontWeight: 600,
                  lineHeight: `${fontTokens.lineHeight.body}px`,
                }}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {serverReachable === false ? (
          <p role="status" style={{ color: colors.accent, fontSize: fontTokens.sizes.caption, margin: 0, textAlign: "center" }}>
            Sin conexión con el servidor. Puedes continuar; algunas acciones fallarán hasta recuperar la red.
          </p>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: spaceTokens[3], marginTop: spaceTokens[6], paddingBottom: spaceTokens[2] }}>
        <button
          type="button"
          className="cve-fade-up-delay"
          onClick={onComenzar}
          style={{
            ...buttonStyle,
            background: colors.primary,
            borderRadius: 999,
            fontSize: fontTokens.sizes.body,
            fontWeight: 700,
            minHeight: 54,
            width: "100%",
          }}
        >
          Comenzar
        </button>
        <p style={{ color: colors.muted, fontSize: fontTokens.sizes.body, margin: 0, textAlign: "center" }}>
          ¿Ya tienes una cuenta?{" "}
          <button
            type="button"
            onClick={onIniciarSesion}
            style={{
              background: "none",
              border: "none",
              color: colors.primary,
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </main>
  );
}
