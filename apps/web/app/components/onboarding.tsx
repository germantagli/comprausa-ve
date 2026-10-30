"use client";

import { fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { APP_BRAND_NAME, onboardingSteps, type OnboardingBulletIcon } from "@comprausa/types";
import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { buttonStyle, colors } from "./styles";

const padX = spaceTokens[4];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = onboardingSteps[step] ?? onboardingSteps[0];
  const last = step >= onboardingSteps.length - 1;

  return (
    <main
      aria-label={`Bienvenida ${APP_BRAND_NAME}`}
      style={{
        background: "linear-gradient(180deg, #D6E8FF 0%, #EAF3FF 18%, #FFFFFF 42%, #FFFFFF 100%)",
        color: colors.text,
        fontFamily: fontTokens.family,
        minHeight: "100dvh",
      }}
    >
      <div
        className="cve-fade-up"
        style={{
          display: "grid",
          gridTemplateRows: "auto auto auto 1fr auto",
          margin: "0 auto",
          maxWidth: 480,
          minHeight: "100dvh",
          paddingBottom: `max(${spaceTokens[6]}px, env(safe-area-inset-bottom, 0px))`,
          paddingTop: `max(${spaceTokens[3]}px, env(safe-area-inset-top, 0px))`,
          width: "100%",
        }}
      >
        <header
          style={{
            alignItems: "center",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            minHeight: 44,
            paddingLeft: `max(${padX}px, env(safe-area-inset-left, 0px))`,
            paddingRight: `max(${padX}px, env(safe-area-inset-right, 0px))`,
          }}
        >
          <span />
          <div style={{ alignItems: "center", display: "flex", gap: spaceTokens[2], justifyContent: "center" }}>
            <Image src="/brand/splash/cart.webp" alt="" width={48} height={38} priority style={{ height: 38, width: "auto" }} />
            <p style={{ lineHeight: 1, margin: 0 }}>
              <span style={{ color: colors.primary, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Trae</span>
              <span style={{ color: colors.accent, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Lo</span>
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

        <div
          style={{
            paddingLeft: `max(${padX}px, env(safe-area-inset-left, 0px))`,
            paddingRight: `max(${padX}px, env(safe-area-inset-right, 0px))`,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              color: colors.deep,
              fontSize: "clamp(24px, 6.2vw, 30px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.18,
              margin: `${spaceTokens[3]}px 0 ${spaceTokens[2]}px`,
            }}
          >
            {current.title}
          </h1>
          <p
            style={{
              color: colors.primary,
              fontSize: fontTokens.sizes.body,
              lineHeight: `${fontTokens.lineHeight.body}px`,
              margin: `0 0 ${spaceTokens[3]}px`,
            }}
          >
            {current.subtitle}
          </p>
        </div>

        {/* Full-bleed hero: edge-to-edge within the phone column */}
        <div
          aria-hidden="true"
          className="cve-fade-up-delay"
          style={{
            margin: 0,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <Image
            key={current.id}
            src={`/brand/onboarding/step-${current.id}.webp`}
            alt=""
            width={1400}
            height={1180}
            priority
            quality={95}
            sizes="(max-width: 480px) 100vw, 480px"
            style={{
              display: "block",
              height: "auto",
              maxHeight: "48dvh",
              minHeight: 220,
              objectFit: "cover",
              objectPosition: "center center",
              width: "100%",
            }}
          />
        </div>

        <ul
          style={{
            display: "grid",
            gap: spaceTokens[3],
            listStyle: "none",
            margin: 0,
            padding: `${spaceTokens[4]}px max(${padX}px, env(safe-area-inset-left, 0px)) ${spaceTokens[2]}px max(${padX}px, env(safe-area-inset-right, 0px))`,
          }}
        >
          {current.bullets.map((bullet) => (
            <li key={bullet.text} style={{ alignItems: "flex-start", display: "flex", gap: spaceTokens[3] }}>
              <BulletIcon name={bullet.icon} />
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

        <div
          style={{
            display: "grid",
            gap: spaceTokens[3],
            marginTop: "auto",
            paddingLeft: `max(${padX}px, env(safe-area-inset-left, 0px))`,
            paddingRight: `max(${padX}px, env(safe-area-inset-right, 0px))`,
            paddingTop: spaceTokens[2],
          }}
        >
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
                  transition: "width 160ms ease",
                  width: index === step ? 22 : 8,
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

const iconBox: CSSProperties = { flexShrink: 0, height: 28, marginTop: 2, width: 28 };

function BulletIcon({ name }: { name: OnboardingBulletIcon }) {
  // Brand badges keep raster marks; line icons use crisp SVG strokes matching the mock.
  if (name === "paypal" || name === "zelle" || name === "pago-movil") {
    return (
      <Image
        src={`/brand/onboarding/icons/${name}.webp`}
        alt=""
        width={28}
        height={28}
        unoptimized
        style={iconBox}
      />
    );
  }
  return <span style={iconBox}>{LINE_ICONS[name]}</span>;
}

const stroke = colors.primary;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const LINE_ICONS: Record<Exclude<OnboardingBulletIcon, "paypal" | "zelle" | "pago-movil">, ReactNode> = {
  search: (
    <Svg>
      <circle cx="12" cy="12" r="7" stroke={stroke} strokeWidth="2.2" />
      <path d="M17.5 17.5 23 23" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  ),
  card: (
    <Svg>
      <rect x="3" y="7" width="22" height="14" rx="2.5" stroke={stroke} strokeWidth="2.2" />
      <path d="M3 12h22" stroke={stroke} strokeWidth="2.2" />
    </Svg>
  ),
  package: (
    <Svg>
      <path d="M14 4 24 9.5 14 15 4 9.5 14 4Z" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M24 9.5V18.5L14 24M4 9.5V18.5L14 24M14 15V24" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
    </Svg>
  ),
  store: (
    <Svg>
      <path d="M4 11 7 5h14l3 6" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M5 11v11h18V11" stroke={stroke} strokeWidth="2.1" />
      <path d="M11 22V15h6v7" stroke={stroke} strokeWidth="2.1" />
    </Svg>
  ),
  apparel: (
    <Svg>
      <path
        d="M9 5.5 11.5 3h5L19 5.5l4 3.2-3.2 2.6-.8-.7V24H9V10.6l-.8.7L5 8.7 9 5.5Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  grid: (
    <Svg>
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="2.1" />
      <rect x="16" y="4" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="2.1" />
      <rect x="4" y="16" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="2.1" />
      <rect x="16" y="16" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="2.1" />
    </Svg>
  ),
  truck: (
    <Svg>
      <path d="M3 9h11v9H3V9Z" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M14 12h5l3 4v2h-8v-6Z" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
      <circle cx="7.5" cy="20.5" r="2" stroke={stroke} strokeWidth="2" />
      <circle cx="19" cy="20.5" r="2" stroke={stroke} strokeWidth="2" />
    </Svg>
  ),
  pin: (
    <Svg>
      <path
        d="M14 24s7-7.2 7-12.2A7 7 0 0 0 7 11.8C7 16.8 14 24 14 24Z"
        stroke={stroke}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="11.5" r="2.4" fill={stroke} />
    </Svg>
  ),
  shield: (
    <Svg>
      <path d="M14 3.5 23 7v6.5c0 5.2-3.7 9.4-9 11-5.3-1.6-9-5.8-9-11V7l9-3.5Z" stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="m9.5 13.5 3 3 6-6.5" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  check: (
    <Svg>
      <circle cx="14" cy="14" r="10" stroke={stroke} strokeWidth="2.2" />
      <path d="m9 14.2 3.2 3.2 7-7.2" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};
