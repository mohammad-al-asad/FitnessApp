import { useLanguage } from "@/hooks/language-context";
import { Stack } from "expo-router";

export default function LogLayout() {
  const { t } = useLanguage();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
        headerBackVisible: true,
      }}
    >
      <Stack.Screen
        name="log"
        options={{ title: t("logFood") as string }}
      />
    </Stack>
  );
}
