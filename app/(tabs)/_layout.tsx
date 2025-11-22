// Defines the main bottom tab layout (Home, Journal, Insights, Settings)
// with a centered floating “+” button that opens the FoodLog modal.

import FoodLogModal from "@/components/FoodLogModal";
import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { Tabs, router } from "expo-router";
import { BookOpen, Home, Plus, Settings, TrendingUp } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const [showModal, setShowModal] = useState(false);
  const colors = useSafeColors();
  const { t, isRTL } = useLanguage();

  const getLabel = (name: string): string => {
    switch (name) {
      case "home":
        return t("home");
      case "journal":
        return t("journal");
      case "insights":
        return t("insights");
      case "settings":
        return t("settings");
      default:
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
  };

  const renderTabButton = (route: any) => {
    const { options } = descriptors[route.key];
    const isFocused = state.routes[state.index].name === route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const color = isFocused ? colors.primary : colors.tabIconDefault;

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.tabItem}
        accessibilityRole="button"
      >
        {options.tabBarIcon && options.tabBarIcon({ color, size: 20 })}
        <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
          {getLabel(route.name)}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredRoutes = state.routes.filter(
    (route: any) => !["createCustomFood", "scanBarcode", "explore"].includes(route.name)
  );

  const leftRoutes = isRTL
    ? filteredRoutes.slice(2).reverse()
    : filteredRoutes.slice(0, 2);
  const rightRoutes = isRTL
    ? filteredRoutes.slice(0, 2).reverse()
    : filteredRoutes.slice(2);

  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.tabContainer}>
        {/* LEFT SIDE TABS (Home + Journal) */}
        <View style={styles.leftTabs}>
          {leftRoutes.map((route: any) => {
            let translateX = 0;
            if (route.name === "home") translateX = -14; // moved slightly left
            if (route.name === "journal") translateX = -4;
            return (
              <View key={route.key} style={{ transform: [{ translateX }] }}>
                {renderTabButton(route)}
              </View>
            );
          })}
        </View>

        {/* RIGHT SIDE TABS (Insights + Settings) */}
        <View style={styles.rightTabs}>
          {rightRoutes.map((route: any) => {
            let translateX = 0;
            if (route.name === "insights") translateX = 4;
            if (route.name === "settings") translateX = 14; // moved slightly right
            return (
              <View key={route.key} style={{ transform: [{ translateX }] }}>
                {renderTabButton(route)}
              </View>
            );
          })}
        </View>
      </View>

      {/* Center + Button */}
      <TouchableOpacity
        style={[
          styles.circularButton,
          { backgroundColor: colors.primary, borderColor: colors.background },
        ]}
        activeOpacity={0.8}
        onPress={() => setShowModal(true)}
      >
        <Plus color={colors.background} size={26} strokeWidth={3} />
      </TouchableOpacity>

      {/* Add Food Modal */}
      <FoodLogModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onLogFood={() => {
          setShowModal(false);
          router.push("/log/log");
        }}
        onCreateCustom={() => {
          setShowModal(false);
          router.push("/modal/createCustomFood");
        }}
        onScanBarcode={() => {
          setShowModal(false);
          router.push("/(tabs)/scanBarcode");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: "relative",
    height: 85,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    marginTop: 4,
  },
  leftTabs: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-evenly",
    paddingRight: 30,
  },
  rightTabs: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-evenly",
    paddingLeft: 30,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 45,
    paddingVertical: 3,
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  circularButton: {
    position: "absolute",
    top: 5,
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color }) => <BookOpen color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings color={color} size={23} />,
        }}
      />
      {/* Hidden Screens */}
      <Tabs.Screen name="createCustomFood" options={{ href: null }} />
      <Tabs.Screen name="scanBarcode" options={{ href: null }} />
    </Tabs>
  );
}
