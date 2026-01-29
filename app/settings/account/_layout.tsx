import { useLanguage } from "@/hooks/language-context";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable } from "react-native";

export default function AccountSettingsLayout() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1A1A1A" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
        headerShown: true,
        presentation: "card",
        headerLeft: () => (
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" style={{ marginHorizontal: 5 }} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Account",
        }}
      />
      <Stack.Screen
        name="changePassword"
        options={{
          title: t("changePassword") as string,
        }}
      />
      <Stack.Screen
        name="termsOfServices"
        options={{
          title: t("termsOfServices") as string,
        }}
      />
      <Stack.Screen
        name="privacyPolicy"
        options={{
          title: t("privacyPolicy") as string,
        }}
      />
      <Stack.Screen
        name="aboutUs"
        options={{
          title: t("aboutUs") as string,
        }}
      />
    </Stack>
  );
}
