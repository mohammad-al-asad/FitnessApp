import { Stack, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable } from "react-native";

export default function SettingsLayout() {
  const router = useRouter();

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
      {["account", "goals", "preferences", "about"].map((name) => (
        <Stack.Screen
          key={name}
          name={name}
          options={{
            title: name.charAt(0).toUpperCase() + name.slice(1),
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
