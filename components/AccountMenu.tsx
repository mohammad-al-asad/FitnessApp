import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const AccountMenu = ({ setIsDeleteModal }: any) => {
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();

  // Define the menu items
  const menuItems = [
    { id: "changePassword", label: t("changePassword"), color: colors.text },
    { id: "termsOfServices", label: t("termsOfServices"), color: colors.text },
    { id: "privacyPolicy", label: t("privacyPolicy"), color: colors.text },
    { id: "aboutUs", label: t("aboutUs"), color: colors.text },
    { id: "deleteAccount", label: t("deleteAccount"), color: "#FF4444" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {menuItems.map((item, index) => (
          <View key={item.id}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
              onPress={() => {
                if (item.id === "deleteAccount") {
                  setIsDeleteModal(true);
                } else {
                  router.push(`/settings/account/${item.id}` as any);
                }
              }}
            >
              <Text
                style={[
                  styles.menuText,
                  {
                    color: item.color,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {item.label}
              </Text>

              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color={colors.placeholder}
              />
            </TouchableOpacity>

            {/* Render divider for all items except the last one */}
            {index < menuItems.length - 1 && (
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden", // Ensures dividers don't bleed out
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 20, // Divider doesn't touch the edges to match the UI look
  },
});

export default AccountMenu;
