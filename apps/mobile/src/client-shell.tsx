import {
  decideEntryGate,
  probeServerReachable,
  restoreAuthenticatedSession,
  type AuthenticatedSession,
} from "@comprausa/api-client";
import { colorTokens, fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { apiBase } from "./api";
import { ExploreScreen, HelpScreen, HomeScreen, OrdersScreen, ProfileScreen } from "./catalog-screens";
import { MobileCartScreen, MobileProductScreen, MobileQuoteScreen } from "./commerce-screens";
import { DemoCommerceProvider, useDemoCommerce } from "./demo-commerce";
import { MobileOperatorScreen } from "./payment-screens";
import { MobileRequestScreen } from "./request-screen";
import { MobileTrackingScreen } from "./tracking-screens";
import {
  clearStoredSession,
  markOnboardingCompleted,
  readOnboardingCompleted,
  readStoredSession,
  resetOnboardingCompleted,
  saveStoredSession,
} from "./session-store";
import { OnboardingScreen } from "./onboarding-screen";
import { SignInScreen } from "./sign-in-screen";
import { SplashScreen } from "./splash-screen";

const colors = colorTokens.light;

type Tab = "inicio" | "explorar" | "carrito" | "pedidos" | "perfil";
type Gate = "checking" | "splash" | "onboarding" | "app";

const tabs: readonly { id: Tab; label: string; glyph: string }[] = [
  { id: "inicio", label: "Inicio", glyph: "⌂" },
  { id: "explorar", label: "Explorar", glyph: "⌕" },
  { id: "carrito", label: "Carrito", glyph: "⊞" },
  { id: "pedidos", label: "Pedidos", glyph: "▤" },
  { id: "perfil", label: "Perfil", glyph: "⚬" },
];

const tabBottomInset = Platform.select({ ios: 12, android: 6, default: 6 })!;

export function ClientShell() {
  return (
    <DemoCommerceProvider>
      <AppShell />
    </DemoCommerceProvider>
  );
}

function AppShell() {
  const { getCartCount, ready } = useDemoCommerce();
  const cartCount = ready ? getCartCount() : 0;
  const [gate, setGate] = useState<Gate>("checking");
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("inicio");
  const [exploreQuery, setExploreQuery] = useState("");
  const [help, setHelp] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInMode, setSignInMode] = useState<"registro" | "entrar">("registro");
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      const stored = await readStoredSession();
      const onboardingCompleted = await readOnboardingCompleted();

      const restorePromise = restoreAuthenticatedSession(apiBase, stored);
      const healthPromise = probeServerReachable(apiBase);

      const { session: restored, cleared } = await restorePromise;
      if (cancelled) {
        return;
      }

      if (cleared) {
        await clearStoredSession();
      } else if (restored && restored !== stored) {
        await saveStoredSession(restored);
      }

      setSession(restored);
      setGate(
        decideEntryGate({
          requiresSplash: true,
          hasValidSession: Boolean(restored),
          onboardingCompleted,
        }),
      );

      void healthPromise.then((reachable) => {
        if (!cancelled) {
          setServerReachable(reachable);
        }
      });
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function openExplore(query?: string): void {
    setExploreQuery(query ?? "");
    setHelp(false);
    setProductId(null);
    setQuoteId(null);
    setRequestOpen(false);
    setReview(false);
    setTracking(false);
    setTab("explorar");
  }

  function closeOverlays(): void {
    setHelp(false);
    setProductId(null);
    setQuoteId(null);
    setRequestOpen(false);
    setReview(false);
    setTracking(false);
  }

  if (gate === "checking") {
    return <SplashScreen loading serverReachable={serverReachable} onComenzar={() => undefined} onIniciarSesion={() => undefined} />;
  }

  if (signingIn) {
    return (
      <SignInScreen
        mode={signInMode}
        onCancel={() => {
          setSigningIn(false);
          if (!session) {
            setGate("splash");
          }
        }}
        onAuthenticated={(next) => {
          void saveStoredSession(next);
          setSession(next);
          setSigningIn(false);
          void readOnboardingCompleted().then((done) => {
            setGate(done ? "app" : "onboarding");
            if (done) {
              setTab("inicio");
            }
          });
        }}
      />
    );
  }

  if (gate === "splash") {
    return (
      <SplashScreen
        serverReachable={serverReachable}
        onComenzar={() => {
          setSignInMode("registro");
          setSigningIn(true);
        }}
        onIniciarSesion={() => {
          setSignInMode("entrar");
          setSigningIn(true);
        }}
      />
    );
  }

  if (gate === "onboarding") {
    return (
      <OnboardingScreen
        onDone={() => {
          void markOnboardingCompleted();
          setGate("app");
        }}
      />
    );
  }

  const overlayOpen = help || Boolean(productId) || Boolean(quoteId) || requestOpen || review || tracking;

  return (
    <View style={styles.frame}>
      <View style={styles.body}>
        {help ? (
          <HelpScreen
            onReplay={() => {
              void resetOnboardingCompleted();
              setHelp(false);
              setGate("onboarding");
            }}
          />
        ) : null}
        {!help && productId ? (
          <MobileProductScreen
            productId={productId}
            session={session}
            onBack={() => setProductId(null)}
            onOpenCart={() => {
              setProductId(null);
              setTab("carrito");
            }}
          />
        ) : null}
        {!help && !productId && quoteId ? (
          <MobileQuoteScreen quoteId={quoteId} session={session} onBack={() => setQuoteId(null)} />
        ) : null}
        {!help && !productId && !quoteId && requestOpen ? (
          <MobileRequestScreen
            session={session}
            onBack={() => setRequestOpen(false)}
            onOpenQuote={(id) => {
              setRequestOpen(false);
              setQuoteId(id);
            }}
            onSignIn={() => {
              setRequestOpen(false);
              setSignInMode("entrar");
              setSigningIn(true);
            }}
          />
        ) : null}
        {!help && !productId && !quoteId && !requestOpen && review && session ? (
          <MobileOperatorScreen session={session} onSession={setSession} onBack={() => setReview(false)} />
        ) : null}
        {!help && !productId && !quoteId && !requestOpen && !review && tracking && session ? (
          <MobileTrackingScreen session={session} onBack={() => setTracking(false)} />
        ) : null}
        {!overlayOpen && tab === "inicio" ? (
          <HomeScreen
            session={session}
            serverReachable={serverReachable}
            onOpenCart={() => setTab("carrito")}
            onOpenOrders={() => setTab("pedidos")}
            onOpenProfile={() => setTab("perfil")}
            onOpenExplore={openExplore}
            onOpenProduct={setProductId}
            onOpenRequest={() => setRequestOpen(true)}
          />
        ) : null}
        {!overlayOpen && tab === "explorar" ? (
          <ExploreScreen onOpenProduct={setProductId} initialQuery={exploreQuery} />
        ) : null}
        {!overlayOpen && tab === "carrito" ? (
          <MobileCartScreen
            session={session}
            onOpenProduct={setProductId}
            onOpenQuote={setQuoteId}
            onSignIn={() => setSigningIn(true)}
          />
        ) : null}
        {!overlayOpen && tab === "pedidos" ? <OrdersScreen session={session} /> : null}
        {!overlayOpen && tab === "perfil" ? (
          <ProfileScreen
            session={session}
            onSignIn={() => setSigningIn(true)}
            onSignedOut={() => {
              void clearStoredSession();
              setSession(null);
              setGate("splash");
            }}
            onHelp={() => setHelp(true)}
            onOrders={() => setTab("pedidos")}
            onReview={() => setReview(true)}
            onTrack={() => setTracking(true)}
          />
        ) : null}
      </View>
      {!overlayOpen ? (
        <View accessibilityRole="tablist" style={[styles.tabs, { paddingBottom: tabBottomInset }]}>
          {tabs.map((item) => {
            const selected = tab === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                onPress={() => {
                  closeOverlays();
                  if (item.id !== "explorar") {
                    setExploreQuery("");
                  }
                  setTab(item.id);
                }}
                style={styles.tab}
              >
                <View style={styles.tabIconWrap}>
                  <Text style={[styles.tabIcon, selected ? styles.tabIconSelected : null]}>{item.glyph}</Text>
                  {item.id === "carrito" && cartCount > 0 ? (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : String(cartCount)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={selected ? styles.tabSelected : styles.tabLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.background,
    flex: 1,
  },
  body: {
    flex: 1,
  },
  tabs: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 60,
    paddingVertical: spaceTokens[2],
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabIcon: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 22,
  },
  tabIconSelected: {
    color: colors.primary,
  },
  cartBadge: {
    alignItems: "center",
    backgroundColor: "#E11D48",
    borderRadius: 999,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3,
    position: "absolute",
    right: -10,
    top: -4,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tabLabel: {
    color: colors.muted,
    fontSize: fontTokens.sizes.caption,
    fontWeight: "500",
    lineHeight: fontTokens.lineHeight.caption,
  },
  tabSelected: {
    color: colors.primary,
    fontSize: fontTokens.sizes.caption,
    fontWeight: "700",
    lineHeight: fontTokens.lineHeight.caption,
  },
});
