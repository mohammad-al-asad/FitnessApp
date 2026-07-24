import FirstSignInSubscriptionModal from "@/components/FirstSignInSubscriptionModal";
import SplashScreen from "@/components/SplashScreen";
import SuperwallOnboardingGate from "@/components/SuperwallOnboardingGate";
import SuperwallRootProvider from "@/components/SuperwallRootProvider";
import { AuthProvider, useAuth } from "@/hooks/auth-context";
import { LanguageProvider, useLanguage } from "@/hooks/language-context";
import { NutritionProvider } from "@/hooks/nutrition-store";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { UserProfileProvider } from "@/hooks/user-profile-context";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Asset } from "expo-asset";
import { router, Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useSuperwall } from "expo-superwall";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  BackHandler,
  StyleSheet,
  View,
} from "react-native";
import "react-native-reanimated";
import { configureRevenueCatForStoredUser } from "@/services/revenuecat";
import { SUPERWALL_ONBOARDING_PLACEMENT } from "@/services/superwall-flow";
import { SafeAreaProvider } from "react-native-safe-area-context";

// 🚀 Keep the native splash screen visible until our custom animation is ready to take over.
// Calling this at the top level is best practice to prevent early auto-hiding.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Inner navigator that handles auth routing
function RootNavigator() {
  const {
    user,
    isInitialized,
    firstSignInSubscriptionPromptVisible,
    completeFirstSignInSubscriptionPrompt,
  } = useAuth();

  const shouldShowSubscriptionPrompt = Boolean(
    user && firstSignInSubscriptionPromptVisible,
  );

  useEffect(() => {
    if (user && isInitialized) {
      router.replace("/(tabs)/home");
    }
  }, [isInitialized, user]);

  if (!isInitialized) {
    return null;
  }

  const handleDismissSubscriptionPrompt = async () => {
    await completeFirstSignInSubscriptionPrompt();
  };

  const handleSubscribeFromPrompt = async () => {
    await completeFirstSignInSubscriptionPrompt();
    router.push("/settings/subscription" as any);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen
          name="index"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="logFood" options={{ gestureEnabled: false }} />
      </Stack>
      <FirstSignInSubscriptionModal
        visible={shouldShowSubscriptionPrompt}
        onDismiss={() => {
          void handleDismissSubscriptionPrompt();
        }}
        onSubscribe={() => {
          void handleSubscribeFromPrompt();
        }}
      />
    </>
  );
}

function SuperwallSplashPreloader() {
  const { isConfigured, preloadPaywalls } = useSuperwall((state) => ({
    isConfigured: state.isConfigured,
    preloadPaywalls: state.preloadPaywalls,
  }));
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!isConfigured || hasPreloaded.current) return;

    hasPreloaded.current = true;
    preloadPaywalls([SUPERWALL_ONBOARDING_PLACEMENT]).catch((error) => {
      console.warn("[Superwall] Splash preload failed:", error);
    });
  }, [isConfigured, preloadPaywalls]);

  return null;
}

// Inner app shell that is allowed to use useLanguage()
function AppShell() {
  const { isRTL, isLoading: isLangLoading } = useLanguage();
  const colorScheme = useColorScheme();
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [startupReady, setStartupReady] = useState(false);

  const appState = useRef(AppState.currentState);
  const shouldShowStartupOverlay = !splashAnimationDone || !startupReady;

  const handleStartupReady = useCallback(() => {
    setStartupReady(true);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload icons
        const images = [
          require("@/assets/icons/instagram.png"),
          require("@/assets/icons/tiktok.png"),
          require("@/assets/icons/snapchat.png"),
        ];

        const cacheImages = images.map((img) => Asset.loadAsync(img));
        await Promise.all(cacheImages);
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();

    // Maintain app state ref for internal tracking
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // 🚀 Native splash hiding is now handled inside SplashScreen component for a smoother transition

  if (isLangLoading) {
    return null;
  }

  return (
    <View
      style={[
        styles.appRoot,
        { direction: isRTL ? "rtl" : "ltr" },
      ]}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <UserProfileProvider>
            <NutritionProvider>
              <SuperwallOnboardingGate
                enabled
                onStartupReady={handleStartupReady}
              >
                <RootNavigator />
              </SuperwallOnboardingGate>
              <StatusBar style="light" />
            </NutritionProvider>
          </UserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
      <SuperwallSplashPreloader />
      {shouldShowStartupOverlay && (
        <View style={styles.startupOverlay}>
          <SplashScreen
            onFinish={() => {
              setSplashAnimationDone(true);
            }}
          />
        </View>
      )}
    </View>
  );
}

// RootLayout now ONLY wraps AppShell with LanguageProvider
function RootLayout() {
  useEffect(() => {
    configureRevenueCatForStoredUser().catch((err) => {
      console.error("RevenueCat configure error:", err);
    });
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Return true to prevent default back behavior
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);
  return (
    <SuperwallRootProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <AppShell />
        </LanguageProvider>
      </SafeAreaProvider>
    </SuperwallRootProvider>
  );
}

export default RootLayout;

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  startupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
});
