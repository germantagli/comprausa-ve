import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.WEB_URL ?? "http://127.0.0.1:3000";
const API = process.env.API_URL ?? "http://127.0.0.1:3001";
const OUT = "/tmp/comprausa-mobile-flow";
const EMAIL = `mobile.flow.${Date.now()}@example.com`;
mkdirSync(OUT, { recursive: true });

const steps = [];
function log(label) {
  steps.push(label);
  console.log("✓", label);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function dismissGate(page) {
  await page.waitForTimeout(1400);
  for (let i = 0; i < 6; i++) {
    const omitir = page.getByRole("button", { name: /^Omitir$/i });
    if (await omitir.isVisible().catch(() => false)) {
      await omitir.click();
      await page.waitForTimeout(400);
      return;
    }
    const empezar = page.getByRole("button", { name: /^Empezar$/i });
    if (await empezar.isVisible().catch(() => false)) {
      await empezar.click();
      await page.waitForTimeout(400);
      return;
    }
    const continuar = page.getByRole("button", { name: /^Continuar$/i });
    // only auto-click Continuar on onboarding (has Bienvenida text)
    if ((await page.getByText("Bienvenida").isVisible().catch(() => false)) && (await continuar.isVisible().catch(() => false))) {
      await continuar.click();
      await page.waitForTimeout(300);
      continue;
    }
    break;
  }
}

async function awaitHome(page) {
  await dismissGate(page);
  await page.waitForSelector("text=Ofertas destacadas", { timeout: 20000 });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-VE",
});
const page = await context.newPage();

try {
  console.log("email", EMAIL);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await shot(page, "01-splash");
  await awaitHome(page);
  await shot(page, "02-inicio");
  log("Splash → bienvenida → inicio");

  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await page.waitForSelector('button[type="submit"]');
  await shot(page, "03-entrar");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel(/Correo|Teléfono/).fill(EMAIL);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  let code = await page.locator('input[autocomplete="one-time-code"]').inputValue();
  if (!code) {
    const peek = await fetch(`${API}/v1/auth/dev/otp-code`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "email", destination: EMAIL }),
    }).then((r) => r.json());
    code = peek.code;
    if (!code) throw new Error("Sin OTP: " + JSON.stringify(peek));
    await page.locator('input[autocomplete="one-time-code"]').fill(code);
  }
  await shot(page, "04-otp");
  log("OTP simulado (dev)");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForSelector('text=Registro', { timeout: 10000 });
  await page.locator('input[autocomplete="given-name"]').fill("Ana");
  await page.locator('input[autocomplete="family-name"]').fill("Prueba");
  await shot(page, "05-registro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  log("Registro");

  await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
  await awaitHome(page);
  log("Login API OK");
  await shot(page, "06-post-login");

  await page.goto(`${BASE}/tiendas`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tiendas de referencia");
  await shot(page, "07-tiendas");
  log("Tiendas");

  await page.goto(`${BASE}/explorar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Búsqueda");
  await shot(page, "08-busqueda");
  log("Búsqueda");

  await page.goto(`${BASE}/filtros`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=El catálogo demo solo filtra");
  await shot(page, "09-filtros");
  log("Filtros");

  await page.goto(`${BASE}/producto/demo-norte`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Caja de demostración Norte");
  await shot(page, "10-ficha");
  log("Ficha");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.waitForSelector("text=Lo agregamos al carrito", { timeout: 15000 });
  log("Agregar al carrito");

  await page.goto(`${BASE}/carrito`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Caja de demostración Norte");
  await shot(page, "11-carrito");
  log("Carrito");

  await page.goto(`${BASE}/direccion`, { waitUntil: "networkidle" });
  await page.getByLabel("Estado").fill("Miranda");
  await page.getByLabel("Ciudad").fill("Caracas");
  await page.getByLabel("Municipio").fill("Chacao");
  await page.getByLabel("Punto de referencia").fill("Cerca del metro");
  await shot(page, "12-direccion");
  await page.getByRole("button", { name: "Continuar al pago" }).click();
  await page.waitForURL(/\/pago/);
  log("Dirección");

  await page.waitForSelector("text=Elige un método");
  await shot(page, "13-pago");
  await page.getByRole("button", { name: /Ir al resumen/ }).click();
  await page.waitForURL(/\/resumen/);
  log("Pago (sin cobrar)");

  await page.waitForSelector("text=Resumen del pedido");
  await shot(page, "14-resumen");
  await page.getByRole("button", { name: /Confirmar \(sin cobrar\)/ }).click();
  await page.waitForURL(/\/pedidos/);
  log("Resumen");

  await page.waitForSelector("text=Seguimiento");
  await shot(page, "15-seguimiento");
  log("Seguimiento");

  await page.goto(`${BASE}/perfil`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Ana");
  await shot(page, "16-perfil");
  log("Perfil");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForSelector("text=Entra para ver tu nombre", { timeout: 15000 });
  await shot(page, "17-logout");
  log("Logout API OK");

  console.log("\nRECORRIDO OK");
  console.log(steps.join(" → "));
} catch (error) {
  await shot(page, "error").catch(() => undefined);
  console.error("FAIL url=", page.url());
  console.error("FAIL body=", (await page.locator("body").innerText().catch(() => "")).slice(0, 600));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
