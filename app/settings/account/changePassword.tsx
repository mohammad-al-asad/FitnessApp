import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { useLanguage } from "@/hooks/language-context";
import { backendChangePassword } from "@/services/backend-auth";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

const ChangePasswordScreen = () => {
  const { t } = useLanguage();
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    const currentPassword = passwords.current;
    const newPassword = passwords.new;
    const confirmPassword = passwords.confirm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(String(t("error")), String(t("pleaseFillAllPasswordFields")));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(String(t("error")), String(t("newPasswordMinLength")));
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        String(t("error")),
        String(t("newPasswordMustDifferFromCurrent")),
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(String(t("error")), String(t("passwordsDoNotMatch")));
      return;
    }

    try {
      setIsSubmitting(true);
      await backendChangePassword({
        currentPassword,
        newPassword,
      });

      setPasswords({ current: "", new: "", confirm: "" });
      Alert.alert(String(t("success")), String(t("passwordUpdatedSuccessfully")));
    } catch (error: any) {
      Alert.alert(
        String(t("error")),
        error?.message || String(t("failedToUpdatePassword")),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            {/* Current Password Field */}
            <CustomInput
              text="currentPassword"
              placeholder="********"
              value={passwords.current}
              secureTextEntry // Ensures dot masking seen in image
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(txt: string) =>
                setPasswords({ ...passwords, current: txt })
              }
            />

            {/* New Password Field */}
            <CustomInput
              text="newPassword"
              placeholder="********"
              value={passwords.new}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(txt: string) =>
                setPasswords({ ...passwords, new: txt })
              }
            />

            {/* Confirm Password Field */}
            <CustomInput
              text="confirmPassword"
              placeholder="********"
              value={passwords.confirm}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(txt: string) =>
                setPasswords({ ...passwords, confirm: txt })
              }
            />
          </View>
        </ScrollView>

      </KeyboardAvoidingView>
        {/* Footer Button fixed at bottom */}
        <View style={styles.footer}>
          <CustomButton
            text={isSubmitting ? "pleaseWait" : "updatePassword"}
            onPress={handleUpdate}
            disabled={isSubmitting}
          />
        </View>
    </View>
  );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(15),
    paddingBottom: verticalScale(100),
  },
  form: {
    gap: verticalScale(8),
  },
  footer: {
    backgroundColor: "#1A1A1A",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(20),
    paddingBottom:
      Platform.OS === "ios" ? verticalScale(30) : verticalScale(20),
  },
});
