import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

const ChangePasswordScreen = () => {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleUpdate = () => {
    // Logic to validate and update password
    console.log("Password Update Triggered", passwords);
  };

  return (
    <SafeAreaView style={styles.container}>
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
              onChangeText={(txt: string) =>
                setPasswords({ ...passwords, confirm: txt })
              }
            />
          </View>
        </ScrollView>

        {/* Footer Button fixed at bottom */}
        <View style={styles.footer}>
          <CustomButton text="updatePassword" onPress={handleUpdate} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingTop: verticalScale(20),
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
