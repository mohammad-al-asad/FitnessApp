// Displays the Settings screen — lets users view and manage their profile, nutrition goals, language preferences, and app info, and sign out via confirmation.
import { useAuth } from "@/hooks/auth-context";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { router } from "expo-router";
import {
  ChevronRight,
  CreditCard,
  Flag,
  Globe,
  Info,
  LogOut,
  Target,
  User,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const settingsItems = [
    {
      id: "account",
      title: t("account"),
      subtitle: t("accountSubtitle"),
      icon: User,
      onPress: () => router.push("/settings/account" as any),
    },
    {
      id: "goals",
      title: t("goalsNutrition"),
      subtitle: t("goalsSubtitle"),
      icon: Target,
      onPress: () => router.push("/settings/goals" as any),
    },
    {
      id: "preferences",
      title: t("preferences"),
      subtitle: t("preferencesSubtitle"),
      icon: Globe,
      onPress: () => router.push("/settings/preferences" as any),
    },
    {
      id: "about",
      title: t("about"),
      subtitle: t("aboutSubtitle"),
      icon: Info,
      onPress: () => router.push("/settings/about" as any),
    },
    {
      id: "subscription",
      title: t("subscription"),
      subtitle: t("subscriptionSubtitle"),
      icon: CreditCard,
      onPress: () => router.push("/settings/subscription" as any),
    },
    {
      id: "report",
      title: t("report"),
      subtitle: t("reportSubtitle"),
      icon: Flag,
      onPress: () => router.push("/settings/report" as any),
    },
  ];

  const handleSignOut = () => {
    Alert.alert(t("signOut") as string, t("areYouSureSignOut") as string, [
      {
        text: t("cancel") as string,
        style: "cancel",
      },
      {
        text: t("signOut") as string,
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              isRTL && styles.rtlText,
              { color: colors.text },
            ]}
          >
            {t("settings")}
          </Text>
          <Text
            style={[
              styles.subtitle,
              isRTL && styles.rtlText,
              { color: colors.placeholder },
            ]}
          >
            {t("customizeExperience")}
          </Text>
        </View>

        {/* User Info Card */}
        {user && (
          <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
            <View
              style={[styles.userAvatar, { backgroundColor: colors.border }]}
            >
              <User size={32} color={colors.primary} />
            </View>
            <View style={styles.userDetails}>
              <Text
                style={[
                  styles.userName,
                  isRTL && styles.rtlText,
                  { color: colors.text },
                ]}
              >
                {user.displayName} {user.displayName}
              </Text>
              <Text
                style={[
                  styles.userEmail,
                  isRTL && styles.rtlText,
                  { color: colors.placeholder },
                ]}
              >
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {/* Settings Items */}
        <View style={styles.settingsContainer}>
          {settingsItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.settingsItem,
                  {
                    backgroundColor: colors.surface,
                    flexDirection: isRTL ? "row" : "row",
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.settingsItemLeft,
                    { flexDirection: isRTL ? "row" : "row" },
                  ]}
                >
                  <View
                    style={[
                      styles.settingsItemIcon,
                      {
                        backgroundColor: colors.border,
                        marginEnd: 16,
                      },
                    ]}
                  >
                    <IconComponent size={24} color={colors.primary} />
                  </View>
                  <View style={styles.settingsItemContent}>
                    <Text
                      style={[
                        styles.settingsItemTitle,
                        isRTL && styles.rtlText,
                        { color: colors.text },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.settingsItemSubtitle,
                        isRTL && styles.rtlText,
                        { color: colors.placeholder },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <ChevronRight
                  size={20}
                  color={colors.placeholder}
                  style={isRTL && { transform: [{ rotate: "180deg" }] }}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity
            style={[
              styles.signOutButton,
              { backgroundColor: colors.surface, borderColor: "#FF6B6B" },
            ]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#FF6B6B" />
            <Text style={styles.signOutButtonText}>{t("signOut")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  userCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  settingsContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  settingsItem: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingsItemSubtitle: {
    fontSize: 14,
  },
  signOutContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B6B",
  },
  // RTL Styles
  rtlText: {
    textAlign: "left",
    paddingRight: 10,
  },
});
