import SplashScreen from "@/components/SplashScreen";
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
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";

// 🔹 Inner app shell that is allowed to use useLanguage()
function AppShell() {
  const { isRTL } = useLanguage();
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Just log to confirm direction on native
    console.log("App direction:", isRTL ? "RTL" : "LTR");

    setTimeout(() => {
      setShowSplash(true);
    }, 0);
  }, [isRTL]);

  useEffect(() => {
    async function prepare() {
      try {
        ExpoSplashScreen.preventAutoHideAsync();

        // 🖼️ Preload About page icons
        const images = [
          require("@/assets/icons/instagram.png"),
          require("@/assets/icons/tiktok.png"),
          require("@/assets/icons/snapchat.png"),
        ];

        const cacheImages = images.map((img) => Asset.loadAsync(img));
        await Promise.all(cacheImages);

        // 🍎 Disable heavy food database preload in development
        // if (!__DEV__) {
        //   try {
        //     const foodData = await getFoodsFromSheetCached();
        //     await AsyncStorage.setItem("cachedFoodDatabase", JSON.stringify(foodData));
        //     console.log("✅ Food database preloaded and cached");
        //   } catch (err) {
        //     console.warn("⚠️ Failed to preload food database", err);
        //   }
        // } else {
        //   console.log("⏩ Skipping food database preload in development");
        // }

        console.log(
          "⏩ Skipping food database preload TEMPORARILY in production",
        );

        // Keep splash for about 4 seconds like before
      } catch (e) {
        console.warn(e);
      } finally {
        // leave empty for now
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (!showSplash) {
      ExpoSplashScreen.hideAsync();
    }
  }, [showSplash]);

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          // DON'T hide native splash yet
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, direction: isRTL ? "rtl" : "ltr" }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <UserProfileProvider>
            <NutritionProvider>
              <RootNavigator />
              <StatusBar style="light" />
            </NutritionProvider>
          </UserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </View>
  );
}

// 🔹 RootLayout now ONLY wraps AppShell with LanguageProvider
export default function RootLayout() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}

function RootNavigator() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="(auth)/index" options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="logFood" options={{ presentation: "modal" }} />
        </>
      )}
    </Stack>
  );
}
