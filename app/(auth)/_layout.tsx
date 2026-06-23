import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="auth"
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen name="auth" />
    </Stack>
  );
}
