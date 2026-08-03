import { TranslationKey } from "@/constants/translations";
import { useLanguage } from "@/hooks/language-context";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsLayout() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const CustomHeader = (props: any) => {
    const title = props.options.title || "Fitco";

    return (
      <View
        style={{
          backgroundColor: "#121212",
          paddingTop: insets.top,
          height: 56 + insets.top,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          flexDirection: "row",
          direction: "ltr",
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
          <ArrowLeft size={24} color="#fff" />
        </Pressable>

        {/* 🎯 Center Section: Title */}
        <Text
          style={{
            color: "#fff",
            fontWeight: "600",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>
    );
  };

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
        headerShown: true,
        header: (props) => <CustomHeader {...props} />,
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
            title: String(t(getTitleKey(name))),
          }}
        />
      ))}
    </Stack>
  );
}
