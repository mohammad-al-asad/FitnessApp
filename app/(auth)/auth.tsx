// auth.tsx — OAuth entry screen, email sign-up/in forms, OTP verification, and Forgot Password flow.
import { translations } from "@/constants/translations";
import { useAuth } from "@/hooks/auth-context";
import {
  backendGoogleSignIn,
  backendAppleSignIn,
  backendVerifyRegister,
  backendForgotPassword,
  backendVerifyResetOtp,
  backendResetPassword,
} from "@/services/backend-auth";
import { useLanguage } from "@/hooks/language-context";
import { usePlacement } from "expo-superwall";
import { router, useLocalSearchParams } from "expo-router";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ChevronLeft,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LogBox,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

LogBox.ignoreLogs(["Text strings must be rendered within a <Text> component"]);

const colors = {
  background: "#1A1A1A",
  text: "#FFFFFF",
  accent: "#4CAF50",
  card: "#2D2D2D",
  placeholder: "#999999",
  border: "#404040",
};

type AuthStep =
  | "welcome"
  | "signup"
  | "signin"
  | "otpVerify"
  | "forgotPassword"
  | "resetOtpVerify"
  | "newPassword";

interface AuthScreenProps {
  onAuthComplete?: () => void;
}

export default function AuthScreen({ onAuthComplete }: AuthScreenProps) {
  const { signIn, signUp, refreshUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ mode?: "signin" | "signup" }>();

  const { registerPlacement } = usePlacement({
    onPresent: () => {
      console.log("[Superwall] Paywall presented from AuthScreen.");
    },
    onDismiss: () => {
      console.log("[Superwall] Paywall dismissed from AuthScreen.");
    },
    onSkip: (reason) => {
      console.log("[Superwall] Paywall skipped from AuthScreen:", reason);
    },
    onError: (error) => {
      console.error("[Superwall] Paywall error from AuthScreen:", error);
    }
  });

  // Steps state
  const [step, setStep] = useState<AuthStep>("welcome");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password / New Password Fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP Fields
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Cycling/Funny text for login screen
  const funnyLines = isRTL
    ? translations.ar.authCyclingTexts
    : translations.en.authCyclingTexts;
  const [funnyLine, setFunnyLine] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * funnyLines.length);
    setFunnyLine(funnyLines[randomIndex]);
  }, [step, isRTL]);

  useEffect(() => {
    if (params.mode === "signup") {
      setStep("signup");
    } else if (params.mode === "signin") {
      setStep("signin");
    }
  }, [params.mode]);

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === "signup" || step === "signin") {
      setStep("welcome");
    } else if (step === "otpVerify") {
      setStep("signup");
    } else if (step === "forgotPassword") {
      setStep("signin");
    } else if (step === "resetOtpVerify") {
      setStep("forgotPassword");
    } else if (step === "newPassword") {
      setStep("resetOtpVerify");
    } else if (step === "welcome") {
      router.back();
    }
  };

  const handleOAuthLogin = async (provider: "Apple" | "Google") => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);
    try {
      if (provider === "Google") {
        await backendGoogleSignIn({ idToken: "demo-google-token" });
      } else {
        await backendAppleSignIn({ identityToken: "demo-apple-token" });
      }
      onAuthComplete?.();
      const updatedUser = await refreshUser();
      if (updatedUser && !updatedUser.isSubscribed) {
        console.log("[Superwall] OAuth login successful, user is unsubscribed. Presenting paywall...");
        registerPlacement({ placement: "paywall" });
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      Alert.alert(t("error") || "Error", err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailFormSubmit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!email || !email.includes("@")) {
      Alert.alert(t("error") || "Error", isRTL ? "يرجى إدخال عنوان بريد إلكتروني صالح." : "Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert(t("error") || "Error", isRTL ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters.");
      return;
    }

    if (step === "signin") {
      // Direct Login (calls signIn backend mock as before)
      setIsLoading(true);
      try {
        const result = await signIn(email, password);
        if (result.success) {
          setTimeout(() => {
            onAuthComplete?.();
            if (result.user && !result.user.isSubscribed) {
              console.log("[Superwall] Email login successful, user is unsubscribed. Presenting paywall...");
              registerPlacement({ placement: "paywall" });
            } else {
              router.replace("/(tabs)/home");
            }
          }, 300);
        } else {
          Alert.alert(t("error") as string, result.error.message);
        }
      } catch (error) {
        Alert.alert(t("error") as string, t("somethingWentWrong") as string);
        console.error("Auth Error:", error);
      } finally {
        setIsLoading(false);
      }
    } else if (step === "signup") {
      // Sign Up verification transition (needs first and last name validation first)
      if (!firstName || !lastName) {
        Alert.alert(t("error") || "Error", isRTL ? "الرجاء إدخال الاسم الأول واسم العائلة." : "First name and last name are required.");
        return;
      }
      setOtp(["", "", "", ""]);
      setStep("otpVerify");
    }
  };

  const handleOtpVerify = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const code = otp.join("");
    if (code.length < 4) {
      Alert.alert(t("error") || "Error", isRTL ? "يرجى إدخال الرمز المكون من 4 أرقام كاملاً." : "Please enter the complete 4-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      await backendVerifyRegister({ email, code });
      onAuthComplete?.();
      const updatedUser = await refreshUser();
      if (updatedUser && !updatedUser.isSubscribed) {
        console.log("[Superwall] Registration verification successful, user is unsubscribed. Presenting paywall...");
        registerPlacement({ placement: "paywall" });
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (error: any) {
      Alert.alert(t("error") || "Error", error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!email || !email.includes("@")) {
      Alert.alert(t("error") || "Error", isRTL ? "يرجى إدخال بريدك الإلكتروني." : "Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      await backendForgotPassword({ email });
      setOtp(["", "", "", ""]);
      setStep("resetOtpVerify");
    } catch (error: any) {
      Alert.alert(t("error") || "Error", error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOtpVerify = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const code = otp.join("");
    if (code.length < 4) {
      Alert.alert(t("error") || "Error", isRTL ? "يرجى إدخال الرمز المكون من 4 أرقام كاملاً." : "Please enter the complete 4-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      await backendVerifyResetOtp({ email, code });
      setStep("newPassword");
    } catch (error: any) {
      Alert.alert(t("error") || "Error", error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t("error") || "Error", isRTL ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("error") || "Error", isRTL ? "كلمات المرور غير متطابقة." : "Passwords do not match.");
      return;
    }

    const code = otp.join("");
    setIsLoading(true);
    try {
      await backendResetPassword({ email, code, newPassword });
      onAuthComplete?.();
      const updatedUser = await refreshUser();
      if (updatedUser && !updatedUser.isSubscribed) {
        console.log("[Superwall] Password reset successful, user is unsubscribed. Presenting paywall...");
        registerPlacement({ placement: "paywall" });
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (error: any) {
      Alert.alert(t("error") || "Error", error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);

    if (text && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sleek top-aligned Back button inside safe area for sub-steps */}
      {step !== "welcome" && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>{t("pleaseWait")}</Text>
            </View>
          ) : (
            <>
              {/* STEP 1: WELCOME SCREEN (OAuth options stack prior to Email screens) */}
              {step === "welcome" && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {isRTL ? "حفظ تقدمك" : "Save your progress"}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {isRTL
                      ? "اختر طريقة تسجيل دخول آمنة لمزامنة سجلاتك وبيانات تقدمك وإعدادات ملفك الشخصي."
                      : "Choose a secure sign-in method to sync your logs, progress data, and profile settings."}
                  </Text>

                  <View style={{ flex: 1, justifyContent: "center", marginVertical: 20 }}>
                    <View style={styles.oauthButtonGroup}>
                    {/* Apple Sign-In Button */}
                    <TouchableOpacity
                      style={[styles.socialPillButton, { backgroundColor: "#000000", borderColor: "#333333" }]}
                      onPress={() => handleOAuthLogin("Apple")}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={require("@/assets/images/apple.png")}
                        style={[styles.socialPillIcon, { width: 34, height: 34, tintColor: "#FFFFFF" }]}
                        resizeMode="contain"
                      />
                      <Text style={[styles.socialPillText, { color: "#FFFFFF" }]}>
                        {isRTL ? "تسجيل الدخول باستخدام Apple" : "Sign in with Apple"}
                      </Text>
                    </TouchableOpacity>

                    {/* Google Sign-In Button */}
                    <TouchableOpacity
                      style={[styles.socialPillButton, { backgroundColor: "#FFFFFF", borderColor: "#E4E4E7" }]}
                      onPress={() => handleOAuthLogin("Google")}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={require("@/assets/images/google.png")}
                        style={styles.socialPillIcon}
                        resizeMode="contain"
                      />
                      <Text style={[styles.socialPillText, { color: "#000000" }]}>
                        {isRTL ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}
                      </Text>
                    </TouchableOpacity>

                    {/* Continue with Email Button */}
                    <TouchableOpacity
                      style={[styles.socialPillButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setStep("signup")}
                      activeOpacity={0.85}
                    >
                      <Mail size={24} color={colors.text} style={styles.socialPillIconMail} />
                      <Text style={[styles.socialPillText, { color: colors.text }]}>
                        {isRTL ? "المتابعة باستخدام البريد الإلكتروني" : "Continue with email"}
                      </Text>
                    </TouchableOpacity>


                  </View>
                </View>
                </View>
              )}

              {/* STEP 2: SIGN-UP FORM SCREEN */}
              {step === "signup" && (
                <View style={styles.stepContent}>
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={[styles.logo, { color: colors.accent }]}>FITCO</Text>
                    <Text style={[styles.subtitle, { color: colors.text }]}>
                      {t("readyToStart")}
                    </Text>
                    <Text style={[styles.description, { color: colors.text, letterSpacing: isRTL ? 0 : 0.4 }]}>
                      {t("makeFutureSelfProud")}
                    </Text>
                  </View>

                  {/* Form */}
                  <View style={styles.form}>
                    <View style={styles.rowInputs}>
                      <View
                        style={[
                          styles.inputContainer,
                          {
                            backgroundColor: colors.card,
                            flexDirection: "row",
                            flex: 1,
                            marginEnd: 8,
                          },
                        ]}
                      >
                        <User
                          size={20}
                          color={colors.accent}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              textAlign: isRTL ? "right" : "left",
                            },
                          ]}
                          placeholder={t("firstName") as string}
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
                            flexDirection: "row",
                            flex: 1,
                          },
                        ]}
                      >
                        <User
                          size={20}
                          color={colors.accent}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.text,
                              textAlign: isRTL ? "right" : "left",
                            },
                          ]}
                          placeholder={t("lastName") as string}
                          placeholderTextColor={colors.placeholder}
                          value={lastName}
                          onChangeText={setLastName}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>

                    {/* Email */}
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: colors.card,
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Mail
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={t("emailAddress") as string}
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
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Lock
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={t("password") as string}
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

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[
                        styles.authButton,
                        { backgroundColor: colors.accent },
                        isLoading && styles.authButtonDisabled,
                      ]}
                      onPress={handleEmailFormSubmit}
                      disabled={isLoading}
                    >
                      <Text style={[styles.authButtonText, { color: colors.background }]}>
                        {t("signUp")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Footer switch to sign-in */}
                  <View style={styles.footer}>
                    <Text style={[styles.switchText, { color: colors.text }]}>
                      {t("alreadyHaveAccount")}
                    </Text>
                    <TouchableOpacity onPress={() => setStep("signin")}>
                      <Text style={[styles.switchButton, { color: colors.accent }]}>
                        {t("signIn")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 3: SIGN-IN FORM SCREEN */}
              {step === "signin" && (
                <View style={styles.stepContent}>
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={[styles.logo, { color: colors.accent }]}>FITCO</Text>
                    <Text style={[styles.subtitle, { color: colors.text }]}>
                      {t("welcomeBack")}
                    </Text>
                    <Text style={[styles.description, { color: colors.text, letterSpacing: isRTL ? 0 : 0.4 }]}>
                      {funnyLine}
                    </Text>
                  </View>

                  {/* Form */}
                  <View style={styles.form}>
                    {/* Email */}
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: colors.card,
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Mail
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={t("emailAddress") as string}
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
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Lock
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={t("password") as string}
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

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[
                        styles.authButton,
                        { backgroundColor: colors.accent },
                        isLoading && styles.authButtonDisabled,
                      ]}
                      onPress={handleEmailFormSubmit}
                      disabled={isLoading}
                    >
                      <Text style={[styles.authButtonText, { color: colors.background }]}>
                        {t("signIn")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.forgotPassword}
                      onPress={() => setStep("forgotPassword")}
                    >
                      <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
                        {t("forgotPassword")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Or divider */}
                  <View style={styles.orDivider}>
                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.orText, { color: colors.placeholder }]}>
                      {isRTL ? "أو" : "or"}
                    </Text>
                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                  </View>

                  {/* OAuth buttons */}
                  <View style={styles.oauthButtonGroup}>
                    {/* Apple Sign-In Button */}
                    <TouchableOpacity
                      style={[styles.socialPillButton, { backgroundColor: "#000000", borderColor: "#333333" }]}
                      onPress={() => handleOAuthLogin("Apple")}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={require("@/assets/images/apple.png")}
                        style={[styles.socialPillIcon, { width: 34, height: 34, tintColor: "#FFFFFF" }]}
                        resizeMode="contain"
                      />
                      <Text style={[styles.socialPillText, { color: "#FFFFFF" }]}>
                        {isRTL ? "تسجيل الدخول باستخدام Apple" : "Sign in with Apple"}
                      </Text>
                    </TouchableOpacity>

                    {/* Google Sign-In Button */}
                    <TouchableOpacity
                      style={[styles.socialPillButton, { backgroundColor: "#FFFFFF", borderColor: "#E4E4E7" }]}
                      onPress={() => handleOAuthLogin("Google")}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={require("@/assets/images/google.png")}
                        style={styles.socialPillIcon}
                        resizeMode="contain"
                      />
                      <Text style={[styles.socialPillText, { color: "#000000" }]}>
                        {isRTL ? "تسجيل الدخول باستخدام Google" : "Sign in with Google"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Footer switch to sign-up */}
                  <View style={styles.footer}>
                    <Text style={[styles.switchText, { color: colors.text }]}>
                      {t("dontHaveAccount")}
                    </Text>
                    <TouchableOpacity onPress={() => setStep("signup")}>
                      <Text style={[styles.switchButton, { color: colors.accent }]}>
                        {t("signUp")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 4: OTP VERIFICATION (Register Verification) */}
              {step === "otpVerify" && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {isRTL ? "تحقق من بريدك الإلكتروني" : "Verify your email"}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {isRTL
                      ? `تم إرسال رمز التحقق المكون من 4 أرقام إلى:\n`
                      : `We've sent a 4-digit verification code to:\n`}
                    <Text style={{ fontWeight: "700", color: colors.text }}>{email}</Text>
                  </Text>

                  <View style={styles.otpGrid}>
                    {otp.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={otpRefs[idx]}
                        style={[styles.otpInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={text => handleOtpChange(text, idx)}
                        onKeyPress={e => handleOtpKeyPress(e, idx)}
                        textAlign="center"
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.authButton, { backgroundColor: colors.accent }]}
                    onPress={handleOtpVerify}
                  >
                    <Text style={[styles.authButtonText, { color: colors.background }]}>
                      {isRTL ? "تأكيد وإنشاء الحساب" : "Verify & Sign Up"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(
                        isRTL ? "تم إرسال الرمز" : "Code Sent",
                        isRTL ? "تم إرسال رمز جديد إلى بريدك الإلكتروني." : "A new OTP code has been sent to your email."
                      );
                    }}
                  >
                    <Text style={[styles.resendText, { color: colors.placeholder }]}>
                      {isRTL ? "إعادة إرسال الرمز" : "Resend code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 5: FORGOT PASSWORD */}
              {step === "forgotPassword" && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {isRTL ? "نسيت كلمة المرور" : "Forgot Password"}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {isRTL
                      ? "أدخل بريدك الإلكتروني لتلقي رمز إعادة تعيين كلمة المرور."
                      : "Enter your email address to receive a password reset code."}
                  </Text>

                  <View style={styles.form}>
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: colors.card,
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Mail
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={t("emailAddress") as string}
                        placeholderTextColor={colors.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.authButton, { backgroundColor: colors.accent }]}
                      onPress={handleForgotPasswordSubmit}
                    >
                      <Text style={[styles.authButtonText, { color: colors.background }]}>
                        {isRTL ? "إرسال رمز التعيين" : "Send Reset Code"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 6: RESET PASSWORD OTP VERIFY */}
              {step === "resetOtpVerify" && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {isRTL ? "رمز إعادة التعيين" : "Verify Reset Code"}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {isRTL
                      ? `أدخل رمز إعادة تعيين كلمة المرور المكون من 4 أرقام المرسل إلى:\n`
                      : `Enter the 4-digit password reset code sent to:\n`}
                    <Text style={{ fontWeight: "700", color: colors.text }}>{email}</Text>
                  </Text>

                  <View style={styles.otpGrid}>
                    {otp.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={otpRefs[idx]}
                        style={[styles.otpInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={text => handleOtpChange(text, idx)}
                        onKeyPress={e => handleOtpKeyPress(e, idx)}
                        textAlign="center"
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.authButton, { backgroundColor: colors.accent }]}
                    onPress={handleResetOtpVerify}
                  >
                    <Text style={[styles.authButtonText, { color: colors.background }]}>
                      {isRTL ? "التحقق من الرمز" : "Verify Code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 7: NEW PASSWORD SETUP */}
              {step === "newPassword" && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {isRTL ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {isRTL
                      ? "قم بتعيين كلمة مرور جديدة آمنة لحسابك."
                      : "Set a secure new password for your account."}
                  </Text>

                  <View style={styles.form}>
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: colors.card,
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Lock
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={isRTL ? "كلمة المرور الجديدة" : "New Password"}
                        placeholderTextColor={colors.placeholder}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>

                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: colors.card,
                          flexDirection: "row",
                        },
                      ]}
                    >
                      <Lock
                        size={20}
                        color={colors.accent}
                        style={{ marginStart: 12, marginEnd: 8 }}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          { color: colors.text, textAlign: isRTL ? "right" : "left" },
                        ]}
                        placeholder={isRTL ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
                        placeholderTextColor={colors.placeholder}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.authButton, { backgroundColor: colors.accent }]}
                      onPress={handleNewPasswordSubmit}
                    >
                      <Text style={[styles.authButtonText, { color: colors.background }]}>
                        {isRTL ? "تحديث وتسجيل الدخول" : "Update & Login"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.placeholder,
    fontWeight: "500",
  },
  stepContent: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
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
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 17,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.9,
    lineHeight: 24,
    marginTop: 4,
  },
  form: {
    marginBottom: 24,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
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
  inputIcon: {
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
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
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  oauthButtonGroup: {
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  socialPillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 1,
  },
  socialPillIcon: {
    width: 28,
    height: 28,
    marginEnd: 12,
  },
  socialPillIconMail: {
    marginEnd: 12,
  },
  socialPillText: {
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  switchText: {
    fontSize: 16,
    marginRight: 6,
  },
  switchButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "left",
    marginTop: 10,
  },
  stepDesc: {
    fontSize: 15,
    color: colors.placeholder,
    lineHeight: 22,
    marginBottom: 28,
    textAlign: "left",
  },
  otpGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    marginTop: 8,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: "800",
  },
  resendBtn: {
    alignItems: "center",
    marginTop: 18,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 8,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: "500",
  },
});
