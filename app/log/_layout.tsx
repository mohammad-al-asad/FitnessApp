import { Stack } from "expo-router";

export default function LogLayout() {
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
        options={{ title: "Log Food" }}
      />
    </Stack>
  );
}
