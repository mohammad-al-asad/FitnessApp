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
import {
  getStoredOnboardingAuthPayload,
  markSuperwallOnboardingCompleted,
  requestSuperwallOnboarding,
  saveReferralCodeStatus,
  type ReferralCodeStatus,
} from "@/services/superwall-flow";
import {
  GoogleSignin,
  isCancelledResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { router, useLocalSearchParams } from "expo-router";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ChevronLeft,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

type RootAuthStep = "welcome" | "signup" | "signin";

interface AuthScreenProps {
  onAuthComplete?: () => void;
  initialStep?: RootAuthStep;
}

const isVerificationRequiredMessage = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("verify") ||
    normalized.includes("verification") ||
    normalized.includes("otp")
  );
};

const AUTH_FALLBACK_MESSAGE = {
  en: "Something went wrong. Please try again.",
  ar: "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
};

const mapAuthMessage = (msg: string, isArabic: boolean): string => {
  if (!msg) {
    return isArabic ? AUTH_FALLBACK_MESSAGE.ar : AUTH_FALLBACK_MESSAGE.en;
  }
  const normalized = msg.trim().toLowerCase();
  if (!normalized) {
    return isArabic ? AUTH_FALLBACK_MESSAGE.ar : AUTH_FALLBACK_MESSAGE.en;
  }

  const dictionary = [
    {
      en: "Please enter a valid email address.",
      ar: "يرجى إدخال عنوان بريد إلكتروني صالح.",
    },
    {
      en: "Password must be at least 6 characters.",
      ar: "يجب أن تكون كلمة المرور 6 أحرف على الأقل.",
    },
    {
      en: "First name and last name are required.",
      ar: "الرجاء إدخال الاسم الأول واسم العائلة.",
    },
    {
      en: "Please enter the complete 4-digit code.",
      ar: "يرجى إدخال الرمز المكون من 4 أرقام كاملاً.",
    },
    {
      en: "Please enter your email address.",
      ar: "يرجى إدخال بريدك الإلكتروني.",
    },
    {
      en: "Please go back and complete your signup details.",
      ar: "يرجى الرجوع وإكمال بيانات التسجيل.",
    },
    {
      en: "Passwords do not match.",
      ar: "كلمات المرور غير متطابقة.",
    },
    {
      en: "Something went wrong. Please try again.",
      ar: "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
    },
    {
      en: "Please check your signup details.",
      ar: "يرجى التحقق من بيانات التسجيل.",
      match: ["Invalid value"],
    },
    {
      en: "Invalid email or password.",
      ar: "البريد الإلكتروني أو كلمة المرور غير صالحة.",
    },
    {
      en: "This email is already in use.",
      ar: "هذا البريد الإلكتروني مستخدم بالفعل.",
    },
    {
      en: "This user is already registered.",
      ar: "هذا المستخدم مسجل بالفعل.",
    },
    {
      en: "User not found.",
      ar: "المستخدم غير موجود.",
    },
    {
      en: "Incorrect password.",
      ar: "كلمة المرور غير صحيحة.",
    },
    {
      en: "Network error. Please check your internet connection.",
      ar: "فشل في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت الخاص بك.",
    },
    {
      en: "Invalid verification code. Please check and try again.",
      ar: "رمز التحقق غير صحيح. يرجى التحقق والمحاولة مرة أخرى.",
    },
    {
      en: "The code has expired. Please request a new one.",
      ar: "انتهت صلاحية الرمز. يرجى طلب رمز جديد.",
    },
    {
      en: "A new OTP code has been sent to your email.",
      ar: "تم إرسال رمز جديد إلى بريدك الإلكتروني.",
    },
    {
      en: "A new password reset code has been sent to your email.",
      ar: "تم إرسال رمز تعيين كلمة المرور الجديد إلى بريدك الإلكتروني.",
    },
    {
      en: "You can now sign in with your new password.",
      ar: "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.",
    },
    {
      en: "Missing Google Web client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID so the backend can verify the ID token audience.",
      ar: "معرف عميل ويب Google مفقود. قم بتعيين EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID حتى يتمكن الجزء الخلفي من التحقق من جمهور رمز معرف الهوية.",
    },
    {
      en: "Missing Google iOS client ID. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for native iOS sign-in.",
      ar: "معرف عميل iOS Google مفقود. قم بتعيين EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID لتسجيل الدخول الأصلي إلى iOS.",
    },
    {
      en: "Google did not return an ID token.",
      ar: "لم ترجع Google رمز معرف الهوية.",
    },
    {
      en: "Apple Sign-In is not available on this device.",
      ar: "تسجيل الدخول باستخدام Apple غير متوفر على هذا الجهاز.",
    },
    {
      en: "Apple did not return an identity token.",
      ar: "لم ترجع Apple رمز الهوية الخاص بها.",
    },
    {
      en: "Please verify your email with the OTP sent to you.",
      ar: "يرجى التحقق من بريدك الإلكتروني باستخدام الرمز المرسل إليك.",
    },
  ];

  for (const item of dictionary) {
    const aliases = [item.en, item.ar, ...(item.match ?? [])].map((value) =>
      value.toLowerCase(),
    );
    if (
      aliases.some(
        (alias) => normalized.includes(alias) || alias.includes(normalized),
      )
    ) {
      return isArabic ? item.ar : item.en;
    }
  }

  const hasArabic = /[\u0600-\u06FF]/.test(msg);
  const hasEnglish = /[a-zA-Z]/.test(msg);

  if (isArabic) {
    return hasArabic ? msg : AUTH_FALLBACK_MESSAGE.ar;
  }

  return hasEnglish ? msg : AUTH_FALLBACK_MESSAGE.en;
};

export default function AuthFlowScreen({
  onAuthComplete,
  initialStep: initialRouteStep,
}: AuthScreenProps) {
  const { signIn, signUp, refreshUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const errorTitle = isRTL ? "خطأ" : "Error";
  const verifyEmailTitle = isRTL
    ? "تحقق من بريدك الإلكتروني"
    : "Verify your email";
  const codeSentTitle = isRTL ? "تم إرسال الرمز" : "Code Sent";
  const passwordUpdatedTitle = isRTL
    ? "تم تحديث كلمة المرور"
    : "Password updated";
  const authMessage = useCallback(
    (message: string) => mapAuthMessage(message, isRTL),
    [isRTL],
  );
  const params = useLocalSearchParams<{ mode?: "signin" | "signup" }>();

  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const hasGoogleClientId = Boolean(googleWebClientId);

  const initialStep: RootAuthStep =
    initialRouteStep ??
    (params.mode === "signup"
      ? "signup"
      : params.mode === "signin"
        ? "signin"
        : "welcome");

  // Steps state
  const [step, setStep] = useState<AuthStep>(initialStep);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCodeStatus, setReferralCodeStatus] =
    useState<ReferralCodeStatus>("invalid");

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
  }, [funnyLines, step, isRTL]);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (!googleWebClientId) return;

    GoogleSignin.configure({
      webClientId: googleWebClientId,
      iosClientId: googleIosClientId || undefined,
      scopes: ["profile", "email"],
      offlineAccess: false,
    });
  }, [googleIosClientId, googleWebClientId]);

  const completeAuthFlow = useCallback(async () => {
    onAuthComplete?.();
    const updatedUser = await refreshUser();
    if (updatedUser?.isSubscribed) {
      router.replace("/(tabs)/home");
    }
  }, [onAuthComplete, refreshUser]);

  const getOAuthOnboardingPayload = useCallback(async () => {
    const isExistingUserSignin = initialStep === "signin" || step === "signin";
    if (isExistingUserSignin) return {};

    return getStoredOnboardingAuthPayload();
  }, [initialStep, step]);

  const navigateToAuthStep = useCallback((nextStep: RootAuthStep) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(nextStep);
    router.replace(`/(auth)/${nextStep}` as any);
  }, []);

  const navigateToSuperwallOnboarding = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    requestSuperwallOnboarding("signin_signup_link");
  }, []);

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === "signup" || step === "signin") {
      navigateToAuthStep("welcome");
    } else if (step === "otpVerify") {
      setStep("signup");
    } else if (step === "forgotPassword") {
      setStep("signin");
    } else if (step === "resetOtpVerify") {
      setStep("forgotPassword");
    } else if (step === "newPassword") {
      setStep("resetOtpVerify");
    } else if (step === "welcome") {
      navigateToAuthStep("welcome");
    }
  };

  const handleOAuthLogin = async (provider: "Apple" | "Google") => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);
    try {
      if (provider === "Google") {
        if (!hasGoogleClientId) {
          throw new Error(
            "Missing Google Web client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID so the backend can verify the ID token audience.",
          );
        }
        if (Platform.OS === "ios" && !googleIosClientId) {
          throw new Error(
            "Missing Google iOS client ID. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for native iOS sign-in.",
          );
        }

        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        const result = await GoogleSignin.signIn();
        if (isCancelledResponse(result)) {
          setIsLoading(false);
          return;
        }

        const tokens = await GoogleSignin.getTokens();
        const idToken = tokens.idToken || result.data.idToken;
        if (!idToken) {
          throw new Error("Google did not return an ID token.");
        }

        const onboardingPayload = await getOAuthOnboardingPayload();
        const isFirstOAuthSignup = Object.keys(onboardingPayload).length > 0;

        await backendGoogleSignIn({
          idToken,
          email: result.data.user.email,
          ...(isFirstOAuthSignup
            ? {
                firstName: result.data.user.givenName ?? undefined,
                lastName: result.data.user.familyName ?? undefined,
                ...onboardingPayload,
              }
            : {}),
        });
        if (isFirstOAuthSignup) {
          await markSuperwallOnboardingCompleted();
        }
        await completeAuthFlow();
        return;
      }

      const isAppleAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAppleAvailable) {
        throw new Error("Apple Sign-In is not available on this device.");
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }

      const onboardingPayload = await getOAuthOnboardingPayload();
      const isFirstOAuthSignup = Object.keys(onboardingPayload).length > 0;

      await backendAppleSignIn({
        identityToken: credential.identityToken,
        email: credential.email ?? undefined,
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
        ...(isFirstOAuthSignup ? onboardingPayload : {}),
      });
      if (isFirstOAuthSignup) {
        await markSuperwallOnboardingCompleted();
      }
      await completeAuthFlow();
    } catch (err: any) {
      if (
        err?.code !== "ERR_REQUEST_CANCELED" &&
        err?.code !== statusCodes.SIGN_IN_CANCELLED
      ) {
        Alert.alert(errorTitle, authMessage(err?.message || String(err)));
      }
      setIsLoading(false);
    } finally {
      if (provider === "Apple") {
        setIsLoading(false);
      }
    }
  };

  const handleEmailFormSubmit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!email || !email.includes("@")) {
      Alert.alert(errorTitle, authMessage("Please enter a valid email address."));
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert(errorTitle, authMessage("Password must be at least 6 characters."));
      return;
    }

    if (step === "signin") {
      setIsLoading(true);
      try {
        const result = await signIn(email, password);
        if (result.success) {
          await completeAuthFlow();
        } else {
          if (isVerificationRequiredMessage(result.error.message)) {
            setOtp(["", "", "", ""]);
            setStep("otpVerify");
            Alert.alert(
              verifyEmailTitle,
              authMessage(result.error.message),
            );
          } else {
            Alert.alert(errorTitle, authMessage(result.error.message));
          }
        }
      } catch (error) {
        Alert.alert(errorTitle, authMessage("Something went wrong. Please try again."));
        console.error("Auth Error:", error);
      } finally {
        setIsLoading(false);
      }
    } else if (step === "signup") {
      if (!firstName || !lastName) {
        Alert.alert(errorTitle, authMessage("First name and last name are required."));
        return;
      }
      setIsLoading(true);
      try {
        const result = await signUp(email, password, firstName, lastName);
        if (result.success && result.requiresVerification) {
          setEmail(result.email);
          setReferralCodeStatus(result.referralCodeStatus);
          await saveReferralCodeStatus(result.referralCodeStatus);
          setOtp(["", "", "", ""]);
          setStep("otpVerify");
        } else if (result.success && "user" in result) {
          await completeAuthFlow();
        } else if (!result.success) {
          Alert.alert(errorTitle, authMessage(result.error.message));
        }
      } catch (error: any) {
        Alert.alert(
          errorTitle,
          authMessage(error?.message || String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOtpVerify = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const code = otp.join("");
    if (code.length < 4) {
      Alert.alert(errorTitle, authMessage("Please enter the complete 4-digit code."));
      return;
    }

    setIsLoading(true);
    try {
      await saveReferralCodeStatus(referralCodeStatus);
      await backendVerifyRegister({ email, code });
      await completeAuthFlow();
    } catch (error: any) {
      Alert.alert(errorTitle, authMessage(error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!email || !email.includes("@")) {
      Alert.alert(errorTitle, authMessage("Please enter your email address."));
      return;
    }
    setIsLoading(true);
    try {
      await backendForgotPassword({ email });
      setOtp(["", "", "", ""]);
      setStep("resetOtpVerify");
    } catch (error: any) {
      Alert.alert(errorTitle, authMessage(error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOtpResend = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!email || !password || !firstName || !lastName) {
      Alert.alert(
        errorTitle,
        authMessage("Please go back and complete your signup details."),
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email, password, firstName, lastName);
      if (result.success && result.requiresVerification) {
        setReferralCodeStatus(result.referralCodeStatus);
        await saveReferralCodeStatus(result.referralCodeStatus);
        setOtp(["", "", "", ""]);
        Alert.alert(
          codeSentTitle,
          authMessage("A new OTP code has been sent to your email."),
        );
      } else if (!result.success) {
        Alert.alert(errorTitle, authMessage(result.error.message));
      }
    } catch (error: any) {
      Alert.alert(errorTitle, authMessage(error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOtpResend = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!email || !email.includes("@")) return;

    setIsLoading(true);
    try {
      await backendForgotPassword({ email });
      setOtp(["", "", "", ""]);
      Alert.alert(
        codeSentTitle,
        authMessage("A new password reset code has been sent to your email."),
      );
    } catch (error: any) {
      Alert.alert(errorTitle, authMessage(error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOtpVerify = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const code = otp.join("");
    if (code.length < 4) {
      Alert.alert(errorTitle, authMessage("Please enter the complete 4-digit code."));
      return;
    }

    setIsLoading(true);
    try {
      await backendVerifyResetOtp({ email, code });
      setStep("newPassword");
    } catch (error: any) {
      Alert.alert(errorTitle, authMessage(error?.message || String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(errorTitle, authMessage("Password must be at least 6 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(errorTitle, authMessage("Passwords do not match."));
      return;
    }

    const code = otp.join("");
    setIsLoading(true);
    try {
      await backendResetPassword({ email, code, newPassword });
      setPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setOtp(["", "", "", ""]);
      setStep("signin");
      Alert.alert(
        passwordUpdatedTitle,
        authMessage("You can now sign in with your new password."),
      );
    } catch (error: any) {
      Alert.alert(errorTitle, authMessage(error?.message || String(error)));
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
    <SafeAreaView style={[styles.container, { backgroundColor: "#0f1012" }]}>
      {/* Root auth screens do not show a back button; sub-flows still need one. */}
      {step !== "welcome" && step !== "signup" && step !== "signin" && (
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

                    {/* Sign up with Email Button */}
                    <TouchableOpacity
                      style={[styles.socialPillButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => navigateToAuthStep("signup")}
                      activeOpacity={0.85}
                    >
                      <Mail size={24} color={colors.text} style={styles.socialPillIconMail} />
                      <Text style={[styles.socialPillText, { color: colors.text }]}>
                        {isRTL ? "التسجيل بالبريد الإلكتروني" : "Sign up with Email"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.welcomeSignInLink}
                      onPress={() => navigateToAuthStep("signin")}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.welcomeSignInText, { color: colors.accent }]}>
                        {t("haveAccountSignIn")}
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
                    <TouchableOpacity onPress={() => navigateToAuthStep("signin")}>
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

                  <View style={styles.orDivider}>
                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.orText, { color: colors.placeholder }]}>
                      {isRTL ? "أو" : "or"}
                    </Text>
                    <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                  </View>

                  <View style={styles.signInSocialGroup}>
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
                  </View>

                  {/* Footer switch to sign-up */}
                  <View style={styles.footer}>
                    <Text style={[styles.switchText, { color: colors.text }]}>
                      {t("dontHaveAccount")}
                    </Text>
                    <TouchableOpacity onPress={navigateToSuperwallOnboarding}>
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
                    onPress={handleRegisterOtpResend}
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

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResetOtpResend}
                  >
                    <Text style={[styles.resendText, { color: colors.placeholder }]}>
                      {isRTL ? "إعادة إرسال الرمز" : "Resend code"}
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
                        {isRTL ? "تحديث كلمة المرور" : "Update Password"}
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
    direction: "ltr",
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
  signInSocialGroup: {
    gap: 12,
    marginBottom: 24,
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
  welcomeSignInLink: {
    alignItems: "center",
    paddingVertical: 10,
  },
  welcomeSignInText: {
    fontSize: 15,
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
