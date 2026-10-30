/** Post-registration bienvenida (4 pantallas). Copy is product text, not placeholders. */

export type OnboardingBulletIcon =
  | "search"
  | "card"
  | "package"
  | "store"
  | "apparel"
  | "grid"
  | "paypal"
  | "zelle"
  | "pago-movil"
  | "truck"
  | "pin"
  | "shield"
  | "check";

export interface OnboardingBullet {
  icon: OnboardingBulletIcon;
  text: string;
}

export interface OnboardingStep {
  /** Asset stem: brand/onboarding/step-{id}.webp|png */
  id: "1" | "2" | "3" | "4";
  title: string;
  subtitle: string;
  bullets: readonly OnboardingBullet[];
  /** Primary CTA; last step uses “Empezar a comprar”. */
  primaryLabel: string;
}

export const onboardingSteps = [
  {
    id: "1",
    title: "¡Bienvenido a TraeLo!",
    subtitle: "Tu puente de compras de USA a Venezuela",
    bullets: [
      { icon: "search", text: "Busca productos en tus tiendas favoritas de Estados Unidos." },
      { icon: "card", text: "Compra de forma segura con nuestros métodos de pago disponibles." },
      { icon: "package", text: "Nosotros nos encargamos del envío y recibes tu pedido en Venezuela." },
    ],
    primaryLabel: "Continuar",
  },
  {
    id: "2",
    title: "Explora tus tiendas favoritas de USA",
    subtitle: "Miles de productos originales en un solo lugar",
    bullets: [
      { icon: "store", text: "Amazon, Walmart, eBay, SHEIN y muchas más." },
      { icon: "apparel", text: "Ropa, calzado, electrónica, hogar, belleza y más." },
      { icon: "grid", text: "Encuentra todo lo que necesitas en un solo lugar." },
    ],
    primaryLabel: "Continuar",
  },
  {
    id: "3",
    title: "Compra fácil y segura",
    subtitle: "Múltiples métodos de pago desde Venezuela",
    bullets: [
      { icon: "card", text: "Tarjetas de crédito y débito internacionales." },
      { icon: "paypal", text: "PayPal." },
      { icon: "zelle", text: "Zelle." },
      { icon: "pago-movil", text: "Pago Móvil (Venezuela)." },
    ],
    primaryLabel: "Continuar",
  },
  {
    id: "4",
    title: "Recibe tus compras en Venezuela",
    subtitle: "Nosotros nos encargamos de todo el proceso",
    bullets: [
      { icon: "truck", text: "Compra en USA, nosotros gestionamos el envío." },
      { icon: "pin", text: "Recibe tu pedido en Venezuela." },
      { icon: "shield", text: "Seguimiento de tu pedido." },
      { icon: "check", text: "Productos originales de tiendas verificadas." },
    ],
    primaryLabel: "Empezar a comprar",
  },
] as const satisfies readonly OnboardingStep[];
