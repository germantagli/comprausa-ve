import type { CSSProperties } from "react";
import { colors } from "./styles";

const base: CSSProperties = {
  display: "block",
  flexShrink: 0,
};

export function IconHome({ active = false }: { active?: boolean }) {
  const stroke = active ? colors.primary : colors.muted;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill={active ? colors.primary : "none"}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {active ? <path d="M10 14h4v7h-4V14Z" fill={colors.surface} /> : null}
    </svg>
  );
}

export function IconStores({ active = false }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path
        d="M4 8h16l-1.2 11.2A2 2 0 0 1 16.81 21H7.19a2 2 0 0 1-1.99-1.8L4 8Z"
        stroke={active ? colors.primary : colors.muted}
        strokeWidth="1.8"
      />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke={active ? colors.primary : colors.muted} strokeWidth="1.8" />
    </svg>
  );
}

/** Magnifying glass — Explorar tab (matches TraeLo Home mock). */
export function IconExplore({ active = false }: { active?: boolean }) {
  const stroke = active ? colors.primary : colors.muted;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <circle cx="11" cy="11" r="6.5" stroke={stroke} strokeWidth="1.8" />
      <path d="m16.5 16.5 3.2 3.2" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconHeart({ active = false }: { active?: boolean }) {
  const stroke = active ? colors.primary : colors.primary;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path
        d="M12 20s-7-4.4-7-9.2A4.2 4.2 0 0 1 12 7.5a4.2 4.2 0 0 1 7 3.3C19 15.6 12 20 12 20Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path
        d="M6 16h12l-1.2-1.4V10a4.8 4.8 0 1 0-9.6 0v4.6L6 16Z"
        stroke="#E6A817"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 17.5a2 2 0 0 0 4 0" stroke="#E6A817" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconCart({ active = false }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path
        d="M3 5h2l2.2 11h10.3l2-8H7.2"
        stroke={active ? colors.primary : colors.muted}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.4" fill={active ? colors.primary : colors.muted} />
      <circle cx="17" cy="19" r="1.4" fill={active ? colors.primary : colors.muted} />
    </svg>
  );
}

export function IconOrders({ active = false }: { active?: boolean }) {
  const stroke = active ? colors.primary : colors.muted;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path
        d="M7 8h10l-.8 11.2A2 2 0 0 1 14.21 21H9.79a2 2 0 0 1-1.99-1.8L7 8Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function IconProfile({ active = false }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <circle cx="12" cy="8" r="3.2" stroke={active ? colors.primary : colors.muted} strokeWidth="1.8" />
      <path
        d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
        stroke={active ? colors.primary : colors.muted}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <circle cx="11" cy="11" r="6.5" stroke={colors.muted} strokeWidth="1.8" />
      <path d="m16.5 16.5 3.2 3.2" stroke={colors.muted} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBox() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={base}>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" stroke={colors.primaryOn} strokeWidth="1.6" />
      <path d="M12 12 20 7.5M12 12 4 7.5M12 12v9" stroke={colors.primaryOn} strokeWidth="1.6" />
    </svg>
  );
}
