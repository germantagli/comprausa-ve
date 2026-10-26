import type { AuthenticatedSession } from "@comprausa/api-client";
import { colorTokens, fontTokens, spaceTokens } from "@comprausa/design-tokens";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ExploreScreen, HelpScreen, HomeScreen, OrdersScreen, ProfileScreen } from "./catalog-screens";
import { MobileCartScreen, MobileProductScreen, MobileQuoteScreen } from "./commerce-screens";
import { MobileOperatorScreen } from "./payment-screens";
import { hasSeenOnboarding, markOnboardingSeen, resetOnboarding } from "./onboarding-memory";
import { OnboardingScreen } from "./onboarding-screen";
import { SignInScreen } from "./sign-in-screen";

const colors = colorTokens.light;

type Tab = "inicio" | "explorar" | "carrito" | "pedidos" | "perfil";

const tabs: readonly { id: Tab; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "explorar", label: "Explorar" },
  { id: "carrito", label: "Carrito" },
  { id: "pedidos", label: "Pedidos" },
  { id: "perfil", label: "Perfil" },
];

export function ClientShell() {
  const [seen, setSeen] = useState(hasSeenOnboarding);
  const [tab, setTab] = useState<Tab>("inicio");
  const [help, setHelp] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [review, setReview] = useState(false);

  if (!seen) {
    return (
      <OnboardingScreen
        onDone={() => {
          markOnboardingSeen();
          setSeen(true);
        }}
      />
    );
  }

  if (signingIn) {
    return (
      <SignInScreen
        onCancel={() => setSigningIn(false)}
        onAuthenticated={(next) => {
          setSession(next);
          setSigningIn(false);
          setTab("perfil");
        }}
      />
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.body}>
        {help ? (
          <HelpScreen
            onReplay={() => {
              resetOnboarding();
              setHelp(false);
              setSeen(false);
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
        {!help && !productId && !quoteId && !review && tab === "inicio" ? (
          <HomeScreen
            session={session}
            onOpenCart={() => setTab("carrito")}
            onOpenOrders={() => setTab("pedidos")}
            onOpenProduct={setProductId}
          />
        ) : null}
        {!help && !productId && !quoteId && !review && tab === "explorar" ? <ExploreScreen onOpenProduct={setProductId} /> : null}
        {!help && !productId && !quoteId && !review && tab === "carrito" ? (
          <MobileCartScreen session={session} onOpenProduct={setProductId} onOpenQuote={setQuoteId} onSignIn={() => setSigningIn(true)} />
        ) : null}
        {!help && !productId && !quoteId && !review && tab === "pedidos" ? <OrdersScreen /> : null}
        {!help && !productId && !quoteId && !review && tab === "perfil" ? (
          <ProfileScreen
            session={session}
            onSignIn={() => setSigningIn(true)}
            onSignedOut={() => setSession(null)}
            onHelp={() => setHelp(true)}
            onReview={() => setReview(true)}
          />
        ) : null}
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map((item) => {
          const selected = !help && tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setHelp(false);
                setProductId(null);
                setQuoteId(null);
                setReview(false);
                setTab(item.id);
              }}
              style={styles.tab}
            >
              <Text style={selected ? styles.tabSelected : styles.tabLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
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
    flexDirection: "row",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: spaceTokens[2],
  },
  tabLabel: {
    color: colors.text,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
  },
  tabSelected: {
    color: colors.primary,
    fontSize: fontTokens.sizes.caption,
    lineHeight: fontTokens.lineHeight.caption,
  },
});
