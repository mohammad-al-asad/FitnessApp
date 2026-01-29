import { TranslationKey } from "@/constants/translations";
import { useLanguage } from "@/hooks/language-context";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";

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
            headerTitle: () => (
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: 17,
                  textAlign: "left",
                  flex: 1,
                }}
              >
                {String(t(getTitleKey(name)))}
              </Text>
            ),
            headerBackVisible: false,

            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={{ marginLeft: 5 }}
              >
                <ArrowLeft size={24} color="#fff" />
              </Pressable>
            ),
          }}
        />
      ))}
    </Stack>
  );
}
