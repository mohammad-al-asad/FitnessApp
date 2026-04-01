import { useLanguage } from "@/hooks/language-context";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AccountSettingsLayout() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const CustomHeader = (props: any) => {
    const title = props.options.title || "Fitco";

    return (
      <View
        style={{
          backgroundColor: "#1A1A1A",
          paddingTop: insets.top,
          height: 56 + insets.top,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
          flexDirection: "row",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute",
            left: 16,
            bottom: 0,
            height: 56,
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          {isRTL ? (
            <ArrowRight size={24} color="#fff" />
          ) : (
            <ArrowLeft size={24} color="#fff" />
          )}
        </Pressable>

        {/* 🎯 Center Section: Title */}
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>
    );
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: (props) => <CustomHeader {...props} />,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("account") as string,
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
