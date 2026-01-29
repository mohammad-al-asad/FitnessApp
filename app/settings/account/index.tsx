// Handles user profile management — lets users view, edit, and save personal data, activity level, goals, and nutrition settings.
import AccountMenu from "@/components/AccountMenu";
import ConfirmationAlert from "@/components/ConfirmationAlert";
import WheelPicker from "@/components/WheelPicker";
import Colors from "@/constants/colors";
import { useAuth } from "@/hooks/auth-context";
import { useLanguage } from "@/hooks/language-context";
import { useNutrition } from "@/hooks/nutrition-store";
import { useUserProfile } from "@/hooks/user-profile-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  Activity,
  ChevronRight,
  Edit3,
  Save,
  Target,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserSettings = any;

const ACTIVITY_LEVELS = [
  {
    key: "sedentary",
    label: "Sedentary",
    description: "Little to no exercise (desk job)",
  },
  {
    key: "lightly_active",
    label: "Lightly Active",
    description: "Light exercise 1-3 days/week",
  },
  {
    key: "moderately_active",
    label: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
  },
  {
    key: "very_active",
    label: "Very Active",
    description: "Hard exercise 6-7 days/week",
  },
  {
    key: "extremely_active",
    label: "Extremely Active",
    description: "Very hard exercise or physical job",
  },
] as const;

const GENDERS = [
  { key: "male", label: "Male", description: "Biological male" },
  { key: "female", label: "Female", description: "Biological female" },
] as const;

const GOALS = [
  {
    key: "lose_weight",
    label: "Lose Weight",
    description: "Create a calorie deficit to lose weight",
  },
  {
    key: "maintain_weight",
    label: "Maintain Weight",
    description: "Keep your current weight stable",
  },
  {
    key: "gain_weight",
    label: "Gain Weight",
    description: "Increase calories to gain weight",
  },
  {
    key: "build_muscle",
    label: "Build Muscle",
    description: "Focus on protein and strength training",
  },
] as const;

export default function AccountScreen() {
  const { settings, saveSettings } = useNutrition();
  const {
    profile,
    updateProfile,
    isLoading: profileLoading,
  } = useUserProfile();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [isDeleteModal, setIsDeleteModal] = useState(false);

  // 🧠 Force reload profile each time Account screen is focused
  useEffect(() => {
    const loadProfile = async () => {
      const userId = user?.uid;
      if (!userId) return;
      const stored = await AsyncStorage.getItem(`fitco_user_profile_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("🔄 Reloaded profile from AsyncStorage:", parsed);
        setProfileData({
          age: parsed.age ?? 0,
          height: parsed.height ?? 0,
          weight: parsed.weight ?? 0,
          gender: parsed.gender ?? "male",
          activityLevel: parsed.activityLevel ?? "moderately_active",
          goal: parsed.goal ?? "maintain_weight",
          targetWeight: parsed.targetWeight ?? 0,
          medicalConditions: parsed.medicalConditions ?? "",
          allergies: parsed.allergies ?? "",
        });
      }
    };
    const unsubscribe = navigation?.addListener?.("focus", loadProfile);
    loadProfile();
    return unsubscribe;
  }, [user]);

  const { t, isRTL } = useLanguage();

  useEffect(() => {
    (async () => {
      const keys = await AsyncStorage.getAllKeys();
      console.log("🔑 All AsyncStorage keys:", keys);

      const userId = user?.uid;
      if (userId) {
        const q = await AsyncStorage.getItem(`questionnaireData_${userId}`);
        const p = await AsyncStorage.getItem(`fitco_user_profile_${userId}`);
        console.log("🧠 questionnaireData:", q);
        console.log("👤 fitco_user_profile:", p);
      }
    })();
  }, [user]);

  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const insets = useSafeAreaInsets();

  const [profileData, setProfileData] = useState(() => ({
    age: profile?.age || 0,
    height: profile?.height || 0,
    weight: profile?.weight || 0,
    gender: profile?.gender || "male",
    activityLevel: profile?.activityLevel || "moderately_active",
    goal: profile?.goal || "maintain_weight",
    targetWeight: profile?.targetWeight || 0,
    medicalConditions: profile?.medicalConditions || "",
    allergies: profile?.allergies || "",
  }));

  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileData({
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        targetWeight: profile.targetWeight || profile.weight,
        medicalConditions: profile.medicalConditions,
        allergies: profile.allergies,
      });
    }
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem("testKey", "hello-ios");
        const value = await AsyncStorage.getItem("testKey");
        console.log("🔍 AsyncStorage test value on iOS:", value);
      } catch (err) {
        console.log("❌ AsyncStorage test failed:", err);
      }
    })();
  }, []);

  if (profileLoading) {
    return null;
  }

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setLocalSettings((prev: UserSettings) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateProfileField = (field: string, value: any) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setHasProfileChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveSettings(localSettings);
      setHasChanges(false);
    } catch {
      // Handle error silently
    }
  };

  const handleProfileSave = async () => {
    try {
      // 1️⃣ Save to Firebase (if applicable)
      await updateProfile(profileData);

      // 2️⃣ Recalculate calories from new data
      const { weight, height, age, gender, activityLevel, goal } = profileData;
      let bmr =
        gender === "male"
          ? 10 * weight + 6.25 * height - 5 * age + 5
          : 10 * weight + 6.25 * height - 5 * age - 161;

      const activityFactors: Record<string, number> = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extremely_active: 1.9,
      };

      bmr *= activityFactors[activityLevel] || 1.55;

      if (goal === "lose_weight") bmr -= 400;
      else if (goal === "gain_weight" || goal === "build_muscle") bmr += 400;

      const calorieGoal = Math.round(bmr);
      const proteinGoal = Math.round(weight * 2);
      const fatsGoal = Math.round((0.25 * calorieGoal) / 9);
      const carbsGoal = Math.round(
        (calorieGoal - (proteinGoal * 4 + fatsGoal * 9)) / 4
      );

      // 3️⃣ Save locally so Nutrition Store picks it up
      await saveSettings({
        ...settings,
        weight,
        calorieGoal,
        proteinGoal,
        fatsGoal,
        carbsGoal,
      });

      // 🧩 NEW — manually reload nutrition context right away
      if (typeof settings.reload === "function") {
        settings.reload();
      }

      setHasProfileChanges(false);
      Alert.alert("Success", "Profile updated and synced!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  // Generate data arrays for wheel pickers
  const ageData = Array.from({ length: 108 }, (_, i) => i + 13); // 13-120
  const heightData = Array.from({ length: 151 }, (_, i) => i + 100); // 100-250 cm
  const weightData = Array.from({ length: 271 }, (_, i) => i + 30); // 30-300 kg

  return (
    <View style={[styles.container, { paddingTop: insets.top - 15 }]}>
      <ConfirmationAlert
        message="confirmDeleteAccount"
        visible={isDeleteModal}
        onConfirm={() => {
          setIsDeleteModal(false);
          console.log("delete");
        }}
        onCancel={() => setIsDeleteModal(false)}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        {user && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
              <User size={20} color={Colors.primary} />
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t("profileInformation")}
              </Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.userInfoLabel, isRTL && styles.rtlText]}>
                {t("signedInAs")}
              </Text>
              <Text style={[styles.userInfoValue, isRTL && styles.rtlText]}>
                {user.displayName || "User"}
              </Text>
              <Text style={[styles.userInfoEmail, isRTL && styles.rtlText]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {/* Edit Profile Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Edit3 size={20} color={Colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t("editProfile")}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.menuItem, isRTL && styles.rtlRow]}
            onPress={() => setShowEditProfile(true)}
          >
            <View style={[styles.menuItemLeft, isRTL && styles.rtlRow]}>
              <User size={20} color={Colors.primary} />
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, isRTL && styles.rtlText]}>
                  Personal Information
                </Text>
                <Text
                  style={[styles.menuItemSubtitle, isRTL && styles.rtlText]}
                >
                  Age, height, weight, activity level
                </Text>
              </View>
            </View>
            <ChevronRight
              size={20}
              color={Colors.placeholder}
              style={isRTL && { transform: [{ rotate: "180deg" }] }}
            />
          </TouchableOpacity>
        </View>

        {/* Personal Information - Quick Weight Update */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t("quickUpdate")}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
              {t("weight")}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={
                localSettings.weight === 0
                  ? ""
                  : localSettings.weight.toString()
              }
              onChangeText={(value) => {
                if (value === "") {
                  updateSetting("weight", 0);
                } else {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue)) {
                    updateSetting("weight", numValue);
                  }
                }
              }}
              keyboardType="numeric"
              placeholder={String(t("enterWeight"))}
              placeholderTextColor={Colors.placeholder}
            />
            <Text style={[styles.inputHint, isRTL && styles.rtlText]}>
              {t("enterCurrentWeight")}
            </Text>
          </View>
        </View>
        <AccountMenu setIsDeleteModal={setIsDeleteModal} />

        {/* Save Buttons */}
        {hasChanges && (
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color={Colors.background} />
              <Text style={styles.saveButtonText}>{t("saveChanges")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={styles.modalKeyboardContainer}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 100}
            >
              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                keyboardDismissMode="interactive"
              >
                {/* Profile Information */}
                <View style={styles.modalSection}>
                  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                    <User size={20} color={Colors.primary} />
                    <Text
                      style={[styles.sectionTitle, isRTL && styles.rtlText]}
                    >
                      Basic Information
                    </Text>
                  </View>

                  {/* Age */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Age
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowPicker("age")}
                    >
                      <Text style={styles.pickerButtonText}>
                        {profileData.age} years
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Height */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Height
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowPicker("height")}
                    >
                      <Text style={styles.pickerButtonText}>
                        {profileData.height} cm
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weight */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Current Weight
                    </Text>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowPicker("weight")}
                    >
                      <Text style={styles.pickerButtonText}>
                        {profileData.weight} kg
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Gender */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Gender
                    </Text>
                    <View style={styles.optionsContainer}>
                      {GENDERS.map((gender) => (
                        <TouchableOpacity
                          key={gender.key}
                          style={[
                            styles.optionCard,
                            profileData.gender === gender.key &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() =>
                            updateProfileField("gender", gender.key)
                          }
                        >
                          <Text
                            style={[
                              styles.optionTitle,
                              profileData.gender === gender.key &&
                                styles.optionTitleSelected,
                            ]}
                          >
                            {gender.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Activity & Goals */}
                <View style={styles.modalSection}>
                  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                    <Activity size={20} color={Colors.primary} />
                    <Text
                      style={[styles.sectionTitle, isRTL && styles.rtlText]}
                    >
                      Activity & Goals
                    </Text>
                  </View>

                  {/* Activity Level */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Activity Level
                    </Text>
                    <View style={styles.optionsContainer}>
                      {ACTIVITY_LEVELS.map((level) => (
                        <TouchableOpacity
                          key={level.key}
                          style={[
                            styles.optionCard,
                            profileData.activityLevel === level.key &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() =>
                            updateProfileField("activityLevel", level.key)
                          }
                        >
                          <Text
                            style={[
                              styles.optionTitle,
                              profileData.activityLevel === level.key &&
                                styles.optionTitleSelected,
                            ]}
                          >
                            {level.label}
                          </Text>
                          <Text
                            style={[
                              styles.optionDescription,
                              profileData.activityLevel === level.key &&
                                styles.optionDescriptionSelected,
                            ]}
                          >
                            {level.description}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Goal */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Goal
                    </Text>
                    <View style={styles.optionsContainer}>
                      {GOALS.map((goal) => (
                        <TouchableOpacity
                          key={goal.key}
                          style={[
                            styles.optionCard,
                            profileData.goal === goal.key &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() => updateProfileField("goal", goal.key)}
                        >
                          <Text
                            style={[
                              styles.optionTitle,
                              profileData.goal === goal.key &&
                                styles.optionTitleSelected,
                            ]}
                          >
                            {goal.label}
                          </Text>
                          <Text
                            style={[
                              styles.optionDescription,
                              profileData.goal === goal.key &&
                                styles.optionDescriptionSelected,
                            ]}
                          >
                            {goal.description}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Target Weight */}
                  {(profileData.goal === "lose_weight" ||
                    profileData.goal === "gain_weight") && (
                    <View style={styles.inputGroup}>
                      <Text
                        style={[styles.inputLabel, isRTL && styles.rtlText]}
                      >
                        Target Weight
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowPicker("targetWeight")}
                      >
                        <Text style={styles.pickerButtonText}>
                          {profileData.targetWeight} kg
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Health Information */}
                <View style={styles.modalSection}>
                  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
                    <Target size={20} color={Colors.primary} />
                    <Text
                      style={[styles.sectionTitle, isRTL && styles.rtlText]}
                    >
                      Health Information
                    </Text>
                  </View>

                  {/* Medical Conditions */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Medical Conditions
                    </Text>
                    <TextInput
                      style={[styles.textArea, isRTL && styles.rtlInput]}
                      placeholder="Diabetes, heart conditions, etc. (optional)"
                      placeholderTextColor={Colors.placeholder}
                      value={profileData.medicalConditions}
                      onChangeText={(value) =>
                        updateProfileField("medicalConditions", value)
                      }
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Allergies */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                      Food Allergies
                    </Text>
                    <TextInput
                      style={[styles.textArea, isRTL && styles.rtlInput]}
                      placeholder="Nuts, dairy, gluten, etc. (optional)"
                      placeholderTextColor={Colors.placeholder}
                      value={profileData.allergies}
                      onChangeText={(value) =>
                        updateProfileField("allergies", value)
                      }
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Save Button */}
                {hasProfileChanges && (
                  <View style={styles.modalSaveContainer}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleProfileSave}
                    >
                      <Save size={20} color={Colors.background} />
                      <Text style={styles.saveButtonText}>
                        Save Profile Changes
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      )}

      {/* Wheel Picker Modal */}
      {showPicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                {showPicker === "age" && "Select Age"}
                {showPicker === "height" && "Select Height"}
                {showPicker === "weight" && "Select Weight"}
                {showPicker === "targetWeight" && "Select Target Weight"}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <WheelPicker
              data={
                showPicker === "age"
                  ? ageData
                  : showPicker === "height"
                  ? heightData
                  : weightData
              }
              selectedValue={
                profileData[showPicker as keyof typeof profileData] as number
              }
              onValueChange={(value) => updateProfileField(showPicker, value)}
              suffix={
                showPicker === "age"
                  ? " years"
                  : showPicker === "height"
                  ? " cm"
                  : " kg"
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.placeholder,
    marginTop: 4,
  },
  saveContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
  },
  userInfo: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userInfoLabel: {
    fontSize: 14,
    color: Colors.placeholder,
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  userInfoEmail: {
    fontSize: 14,
    color: Colors.placeholder,
  },
  // RTL Styles
  rtlText: {
    textAlign: "right",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlInput: {
    textAlign: "right",
  },
  pickerButton: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 80,
    textAlignVertical: "top",
  },
  optionsContainer: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.placeholder,
    lineHeight: 18,
  },
  optionDescriptionSelected: {
    color: Colors.primary,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerCancel: {
    fontSize: 16,
    color: Colors.placeholder,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Menu Item Styles
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: Colors.placeholder,
  },
  // Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Platform.OS === "web" ? 20 : 20,
    width: Platform.OS === "web" ? "90%" : "100%",
    height: Platform.OS === "web" ? "80%" : "95%",
    maxHeight: Platform.OS === "web" ? "80%" : "95%",
    overflow: "hidden",
    flex: Platform.OS !== "web" ? 1 : undefined,
    ...(Platform.OS !== "web" && {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginTop: 20,
    }),
  },
  modalKeyboardContainer: {
    flex: 1,
    minHeight: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.placeholder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: Platform.OS !== "web" ? 200 : 20,
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalSaveContainer: {
    padding: 20,
  },
});
