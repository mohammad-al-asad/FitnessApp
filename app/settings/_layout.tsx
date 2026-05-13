import { TranslationKey } from "@/constants/translations";
import { useLanguage } from "@/hooks/language-context";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export default function SettingsLayout() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  const getTitleKey = (name: string): TranslationKey => {
    switch (name) {
      case "account":
        return "account";
      case "goals":
        return "goalsNutrition";
      case "preferences":
        return "preferences";
      case "about":
        return "about";
      case "subscription":
        return "subscription";
      case "report":
        return "report";
      default:
        return "account";
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
        headerTitleAlign: "center",
        headerShown: true,
        presentation: "card",
      }}
    >
      {[
        "account",
        "goals",
        "preferences",
        "about",
        "subscription",
        "report",
      ].map((name) => (
        <Stack.Screen
          key={name}
          name={name}
          options={{
            headerShown: name === "account" ? false : true,
            headerTitle: String(t(getTitleKey(name))),
            headerBackVisible: false,

            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 38,
                  height: 38,
                  justifyContent: "center",
                  alignItems: "center",
                  marginLeft: 10,
                }}
              >
                {isRTL ? (
                  <ArrowRight size={22} color="#fff" />
                ) : (
                  <ArrowLeft size={22} color="#fff" />
                )}
              </Pressable>
            ),
          }}
        />
      ))}
    </Stack>
  );
}
