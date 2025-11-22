// Controls the login and signup screen UI, handling user authentication (sign in/up), input fields, and navigation to the main app.
import { useAuth } from "@/hooks/auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LogBox,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
LogBox.ignoreLogs(["Text strings must be rendered within a <Text> component"]);

// 🧩 Temporary fallback for removed translation system
const useLanguage = () => ({
  t: (x: string) => x,
  isRTL: false,
});

const useSafeColors = () => ({
  background: "#1A1A1A",
  text: "#FFFFFF",
  accent: "#4CAF50",
  card: "#2D2D2D",
  placeholder: "#999999",
});

interface AuthScreenProps {
  onAuthComplete?: () => void;
}

export default function AuthScreen({ onAuthComplete }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();

  const [isLogin, setIsLogin] = useState(true);
  const funnyLines = [
  "Back again? Your macros filed a missing report.",
  "Don’t worry, your calories didn’t tell anyone.",
  "Your streak may be gone, but we forgive you.",
  "Your abs sent a search party.",
  "Even the scale’s been gossiping about you.",
];


const [funnyLine, setFunnyLine] = useState("");

useEffect(() => {
  const randomIndex = Math.floor(Math.random() * funnyLines.length);
  setFunnyLine(funnyLines[randomIndex]);
}, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAuth = async () => {
  setIsLoading(true);
  setErrors({});
  try {
    const result = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, firstName, lastName);
if (result.success) {
  setTimeout(async () => {
    try {
      console.log("✅ Auth success. isLogin:", isLogin);

      if (isLogin) {
        router.replace("/(tabs)/home");
      } else {
        await AsyncStorage.removeItem("hasCompletedQuestionnaire");
        console.log("🧭 New signup → redirecting to questionnaire");
        router.replace("/(onboarding)/questionnaire");
      }
    } catch (err) {
      console.error("Error checking questionnaire status:", err);
      router.replace("/(onboarding)/questionnaire");
    }
  }, 300);
}



 else {
      // handle error
      Alert.alert("Error", result.error.message);
      if (result.error.message.toLowerCase().includes("email")) {
        setErrors({ email: result.error.message });
      } else if (result.error.message.toLowerCase().includes("password")) {
        setErrors({ password: result.error.message });
      }
    }
  } catch (error) {
    Alert.alert("Error", "Something went wrong. Please try again.");
    console.error("Auth Error:", error);
  } finally {
    setIsLoading(false);
  }
};


  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setErrors({});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.accent }]}>FITCO</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {isLogin ? t("Welcome back!") : t("Ready to start your journey?")}
            </Text>
            <Text style={[styles.description, { color: colors.text }]}>
 {isLogin ? funnyLine : "Let’s make your future self proud."}

</Text>

          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <User size={20} color={colors.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, textAlign: isRTL ? "right" : "left" },
                    ]}
                    placeholder={t("First name")}
                    placeholderTextColor={colors.placeholder}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <User size={20} color={colors.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, textAlign: isRTL ? "right" : "left" },
                    ]}
                    placeholder={t("Last name")}
                    placeholderTextColor={colors.placeholder}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            {/* Email */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.card,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <Mail size={20} color={colors.accent} style={{ marginStart: 12, marginEnd: 8 }} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, textAlign: isRTL ? "right" : "left" },
                ]}
                placeholder={t("Email address")}
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.card,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <Lock size={20} color={colors.accent} style={{ marginStart: 12, marginEnd: 8 }} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, textAlign: isRTL ? "right" : "left" },
                ]}
                placeholder={t("Password")}
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 8, marginStart: 8, marginEnd: 12 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.accent} />
                ) : (
                  <Eye size={20} color={colors.accent} />
                )}
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.authButton,
                { backgroundColor: colors.accent },
                isLoading && styles.authButtonDisabled,
              ]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={[styles.authButtonText, { color: colors.background }]}>
                {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

                   {/* Footer */}
          <View
            style={[
              styles.footer,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text
              style={[
                styles.switchText,
                { color: colors.text, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text
                style={[
                  styles.switchButton,
                  { color: colors.accent, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: "center", marginBottom: 40 },
  logo: {
  fontSize: 72,
  fontWeight: "900",
  letterSpacing: -2,
  marginBottom: 8,
  includeFontPadding: false,
  textShadowColor: "rgba(0, 0, 0, 0.1)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
},

  subtitle: { fontSize: 24, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  description: {
  fontSize: 17,
  fontWeight: "500",
  letterSpacing: 0.4,
  textAlign: "center",
  opacity: 0.9,
  lineHeight: 24,
  marginTop: 4,
  color: "#CCCCCC",
},

  form: { marginBottom: 32 },
  inputContainer: {
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: { marginHorizontal: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 16 },
  authButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  authButtonDisabled: { opacity: 0.7 },
  authButtonText: { fontSize: 18, fontWeight: "600" },
  forgotPassword: { alignItems: "center", marginTop: 16 },
  forgotPasswordText: { fontSize: 14, fontWeight: "500" },
  footer: { flexDirection: "row", alignItems: "center" },
  switchText: { fontSize: 16, marginRight: 6 },
  switchButton: { fontSize: 16, fontWeight: "600" },
});

