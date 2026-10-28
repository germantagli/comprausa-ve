"use client";

import { colorTokens, fontTokens, radiusTokens, spaceTokens } from "@comprausa/design-tokens";
import { filterCountries, type CountryDialCode } from "@comprausa/utils";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const colors = colorTokens.light;

export function CountryDialPicker({
  value,
  onChange,
}: {
  value: CountryDialCode;
  onChange: (next: CountryDialCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const countries = useMemo(() => filterCountries(query), [query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="entrar-control"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Código de país ${value.name} ${value.dial}`}
        onClick={() => setOpen(true)}
        style={triggerStyle}
      >
        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
          {value.flag}
        </span>
        <span style={{ color: colors.deep, fontWeight: 700 }}>{value.dial}</span>
        <span aria-hidden="true" style={{ color: colors.muted, fontSize: 12 }}>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={overlayStyle}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
              setQuery("");
            }
          }}
        >
          <div style={sheetStyle}>
            <div style={sheetHeaderStyle}>
              <h2 id={titleId} style={sheetTitleStyle}>
                País / código
              </h2>
              <button
                type="button"
                className="entrar-control"
                aria-label="Cerrar"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                style={closeStyle}
              >
                ✕
              </button>
            </div>
            <input
              ref={searchRef}
              className="entrar-control"
              style={searchStyle}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar país o código"
              inputMode="search"
              autoComplete="off"
            />
            <ul style={listStyle}>
              {countries.map((item) => {
                const selected = item.iso2 === value.iso2 && item.dial === value.dial;
                return (
                  <li key={`${item.iso2}-${item.dial}`}>
                    <button
                      type="button"
                      className="entrar-control"
                      onClick={() => {
                        onChange(item);
                        setOpen(false);
                        setQuery("");
                      }}
                      style={rowStyle(selected)}
                    >
                      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1, width: 28 }}>
                        {item.flag}
                      </span>
                      <span style={{ flex: 1, textAlign: "left" }}>
                        <span style={{ color: colors.deep, display: "block", fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: colors.muted, fontSize: fontTokens.sizes.caption }}>{item.iso2}</span>
                      </span>
                      <span style={{ color: colors.deep, fontWeight: 700 }}>{item.dial}</span>
                    </button>
                  </li>
                );
              })}
              {countries.length === 0 ? (
                <li style={{ color: colors.muted, padding: spaceTokens[4], textAlign: "center" }}>Sin resultados</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

const triggerStyle = {
  alignItems: "center",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  cursor: "pointer",
  display: "inline-flex",
  gap: spaceTokens[2],
  minHeight: 52,
  padding: `0 ${spaceTokens[3]}px`,
} as const;

const overlayStyle = {
  background: "rgba(20, 36, 59, 0.45)",
  bottom: 0,
  left: 0,
  position: "fixed" as const,
  right: 0,
  top: 0,
  zIndex: 80,
};

const sheetStyle = {
  background: colors.surface,
  borderRadius: `${radiusTokens.lg}px ${radiusTokens.lg}px 0 0`,
  bottom: 0,
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  left: 0,
  maxHeight: "82dvh",
  padding: `${spaceTokens[4]}px ${spaceTokens[4]}px 0`,
  position: "absolute" as const,
  right: 0,
};

const sheetHeaderStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  marginBottom: spaceTokens[3],
} as const;

const sheetTitleStyle = {
  color: colors.deep,
  fontSize: fontTokens.sizes.title,
  fontWeight: 800,
  margin: 0,
} as const;

const closeStyle = {
  background: "none",
  border: "none",
  color: colors.muted,
  cursor: "pointer",
  fontSize: 20,
  minHeight: 44,
  minWidth: 44,
} as const;

const searchStyle = {
  background: colors.background,
  border: `1px solid ${colors.border}`,
  borderRadius: radiusTokens.md,
  color: colors.text,
  font: "inherit",
  marginBottom: spaceTokens[3],
  minHeight: 48,
  padding: `0 ${spaceTokens[3]}px`,
  width: "100%",
} as const;

const listStyle = {
  listStyle: "none",
  margin: 0,
  overflowY: "auto" as const,
  padding: `0 0 ${spaceTokens[6]}px`,
};

function rowStyle(selected: boolean) {
  return {
    alignItems: "center",
    background: selected ? "#EAF3FF" : "transparent",
    border: "none",
    borderBottom: `1px solid ${colors.border}`,
    cursor: "pointer",
    display: "flex",
    gap: spaceTokens[3],
    minHeight: 56,
    padding: `${spaceTokens[2]}px ${spaceTokens[1]}px`,
    width: "100%",
  } as const;
}
