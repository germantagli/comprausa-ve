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
import { MobileOperatorScreen } from "./payment-screens";
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
    setReview(false);
    setTracking(false);
    setTab("explorar");
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

  const overlayOpen = help || Boolean(productId) || Boolean(quoteId) || review || tracking;

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
        {!help && !productId && !quoteId && review && session ? (
          <MobileOperatorScreen session={session} onSession={setSession} onBack={() => setReview(false)} />
        ) : null}
        {!help && !productId && !quoteId && !review && tracking && session ? (
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
                  setHelp(false);
                  setProductId(null);
                  setReview(false);
                  setTracking(false);
                  setQuoteId(null);
                  if (item.id !== "explorar") {
                    setExploreQuery("");
                  }
                  setTab(item.id);
                }}
                style={styles.tab}
              >
                <Text style={[styles.tabIcon, selected ? styles.tabIconSelected : null]}>{item.glyph}</Text>
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
  tabIcon: {
    color: colors.muted,
    fontSize: 18,
    lineHeight: 22,
  },
  tabIconSelected: {
    color: colors.primary,
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
