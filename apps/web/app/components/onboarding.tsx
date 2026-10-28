"use client";

import { fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME, onboardingSteps } from "@comprausa/types";
import Image from "next/image";
import { useState } from "react";
import { buttonStyle, colors } from "./styles";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;

  return (
    <main
      aria-label={`Bienvenida ${APP_BRAND_NAME}`}
      style={{
        background: "linear-gradient(180deg, #EAF3FF 0%, #FFFFFF 28%, #FFFFFF 100%)",
        color: colors.text,
        fontFamily: fontTokens.family,
        minHeight: "100dvh",
      }}
    >
      <div
        className="cve-page cve-fade-up"
        style={{
          display: "grid",
          gap: spaceTokens[3],
          gridTemplateRows: "auto 1fr auto",
          margin: "0 auto",
          maxWidth: 480,
          minHeight: "100dvh",
          padding: `${spaceTokens[4]}px ${spaceTokens[4]}px ${spaceTokens[6]}px`,
          width: "100%",
        }}
      >
        <header style={{ alignItems: "center", display: "grid", gridTemplateColumns: "1fr auto 1fr", minHeight: 44 }}>
          <span />
          <div style={{ alignItems: "center", display: "flex", gap: spaceTokens[2], justifyContent: "center" }}>
            <Image src="/brand/splash/cart.webp" alt="" width={44} height={36} priority style={{ height: 36, width: "auto" }} />
            <p style={{ lineHeight: 1, margin: 0 }}>
              <span style={{ color: colors.primary, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Trae</span>
              <span style={{ color: colors.accent, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>Lo</span>
            </p>
          </div>
          <p
            aria-label={`Paso ${step + 1} de ${onboardingSteps.length}`}
            style={{
              color: colors.muted,
              fontSize: fontTokens.sizes.caption,
              fontWeight: 600,
              margin: 0,
              textAlign: "right",
            }}
          >
            {step + 1}/{onboardingSteps.length}
          </p>
        </header>

        <div style={{ display: "grid", gap: spaceTokens[3], alignContent: "start" }}>
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                color: colors.deep,
                fontSize: "clamp(22px, 5.8vw, 28px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                margin: `0 0 ${spaceTokens[2]}px`,
              }}
            >
              {current.title}
            </h1>
            <p
              style={{
                color: colors.primary,
                fontSize: fontTokens.sizes.body,
                lineHeight: `${fontTokens.lineHeight.body}px`,
                margin: 0,
              }}
            >
              {current.subtitle}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="cve-fade-up-delay"
            style={{
              borderRadius: radiusTokens.lg,
              margin: `0 -${spaceTokens[1]}px`,
              overflow: "hidden",
            }}
          >
            <Image
              key={current.id}
              src={`/brand/onboarding/step-${current.id}.webp`}
              alt=""
              width={1200}
              height={1000}
              priority
              sizes="(max-width: 480px) 100vw, 480px"
              style={{ display: "block", height: "auto", maxHeight: "34dvh", objectFit: "contain", width: "100%" }}
            />
          </div>

          <ul
            style={{
              display: "grid",
              gap: spaceTokens[3],
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {current.bullets.map((bullet) => (
              <li key={bullet.text} style={{ alignItems: "flex-start", display: "flex", gap: spaceTokens[3] }}>
                <Image
                  src={`/brand/onboarding/icons/${bullet.icon}.webp`}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  style={{ flexShrink: 0, height: 28, marginTop: 2, width: 28 }}
                />
                <span
                  style={{
                    color: colors.deep,
                    fontSize: fontTokens.sizes.body,
                    fontWeight: 600,
                    lineHeight: `${fontTokens.lineHeight.body}px`,
                  }}
                >
                  {bullet.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: "grid", gap: spaceTokens[3], marginTop: spaceTokens[2] }}>
          <div
            aria-hidden="true"
            style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "center", padding: `${spaceTokens[1]}px 0` }}
          >
            {onboardingSteps.map((item, index) => (
              <span
                key={item.id}
                style={{
                  background: index === step ? colors.primary : "#D7E0EC",
                  borderRadius: 999,
                  display: "block",
                  height: 8,
                  width: 8,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            style={{
              ...buttonStyle,
              borderRadius: radiusTokens.lg,
              fontSize: fontTokens.sizes.body,
              fontWeight: 700,
              minHeight: 52,
              width: "100%",
            }}
            onClick={() => (last ? onDone() : setStep((currentStep) => currentStep + 1))}
          >
            {current.primaryLabel}
          </button>
          <button
            type="button"
            style={{
              background: colors.surface,
              border: `1.5px solid ${colors.primary}`,
              borderRadius: radiusTokens.lg,
              color: colors.primary,
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              minHeight: 48,
              width: "100%",
            }}
            onClick={onDone}
          >
            Omitir
          </button>
        </div>
      </div>
    </main>
  );
}
