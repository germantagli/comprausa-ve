"use client";

import { colors, spaceTokens } from "./styles";

export function CheckoutStepper({ steps, active }: { steps: readonly string[]; active: number }) {
  return (
    <ol className="cve-stepper" aria-label="Pasos del pedido">
      {steps.map((label, index) => {
        const isActive = index === active;
        const done = index < active;
        return (
          <li
            key={label}
            style={{
              alignItems: "center",
              background: isActive ? colors.primary : colors.surface,
              border: `1px solid ${isActive ? colors.primary : colors.border}`,
              borderRadius: 999,
              color: isActive ? colors.primaryOn : done ? colors.success : colors.muted,
              display: "inline-flex",
              fontSize: 13,
              fontWeight: 700,
              gap: 8,
              minHeight: 40,
              padding: `0 ${spaceTokens[3]}px`,
            }}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
