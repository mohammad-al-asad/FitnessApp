import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useGuidedTour } from "@/hooks/guided-tour-context";
import { useLanguage } from "@/hooks/language-context";
import { Search, Plus, Barcode, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogFood: () => void;
  onScanBarcode: () => void;
  onCreateCustom: () => void;
  onScanMeal: () => void;
}

export default function FoodLogModal({
  visible,
  onClose,
  onLogFood,
  onScanBarcode,
  onCreateCustom,
  onScanMeal,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const { isTourActive, step, setTourStep } = useGuidedTour();

  const isStep2Active = isTourActive && step === 2;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isStep2Active) {
      pulseAnim.setValue(1);
      return;
    }

    // Subtle pulsating animation for the Step 2 highlighted tile
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isStep2Active, pulseAnim]);

  const handleMealScannerPress = () => {
    if (isStep2Active) {
      setTourStep(3);
    }
    onScanMeal();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={isStep2Active ? undefined : onClose}
      useNativeDriver
      backdropTransitionOutTiming={0}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={280}
      animationOutTiming={220}
      backdropColor="rgba(0,0,0,0.75)"
      style={styles.modal}
    >
      <View
        style={[
          styles.container,
          { paddingBottom: 20 + (insets?.bottom || 0) },
        ]}
      >
        {/* drag bar */}
        <View style={styles.dragHandle} />

        {/* header */}
        <View
          style={[
            styles.headerRow,
            isRTL && { flexDirection: "row-reverse" },
            isStep2Active && { opacity: 0.15 },
          ]}
          pointerEvents={isStep2Active ? "none" : "auto"}
        >
          <Text style={styles.title}>{t("addFoodMenu") || "Add Food"}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 2x2 Grid Layout */}
        <View style={styles.grid}>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            {/* Block 1: Log Food */}
            <TouchableOpacity
              style={[styles.block, isStep2Active && { opacity: 0.15 }]}
              onPress={onLogFood}
              activeOpacity={0.8}
              disabled={isStep2Active}
            >
              <View style={styles.iconCircle}>
                <Search size={22} color="#22c55e" />
              </View>
              <Text style={styles.blockTitle}>{t("logFood")}</Text>
              <Text style={styles.blockDesc}>{t("searchFoodDesc")}</Text>
            </TouchableOpacity>

            {/* Block 2: Scan Barcode */}
            <TouchableOpacity
              style={[styles.block, isStep2Active && { opacity: 0.15 }]}
              onPress={onScanBarcode}
              activeOpacity={0.8}
              disabled={isStep2Active}
            >
              <View style={styles.iconCircle}>
                <Barcode size={22} color="#22c55e" />
              </View>
              <Text style={styles.blockTitle}>{t("scanBarcode")}</Text>
              <Text style={styles.blockDesc}>{t("scanBarcodeDesc")}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            {/* Block 3: Meal Scanner (Highlighted & Animated in Step 2) */}
            <Animated.View
              style={[
                styles.blockWrapper,
                isStep2Active && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.block,
                  isStep2Active && styles.highlightedBlock,
                ]}
                onPress={handleMealScannerPress}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.iconCircle,
                    isStep2Active && styles.highlightedIconCircle,
                  ]}
                >
                  <MaterialCommunityIcons name="food-apple" size={24} color="#22c55e" />
                </View>
                <Text style={styles.blockTitle}>{t("mealScanner")}</Text>
                <Text style={styles.blockDesc}>{t("mealScannerDesc")}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Block 4: Create Custom Food */}
            <TouchableOpacity
              style={[styles.block, isStep2Active && { opacity: 0.15 }]}
              onPress={onCreateCustom}
              activeOpacity={0.8}
              disabled={isStep2Active}
            >
              <View style={styles.iconCircle}>
                <Plus size={22} color="#22c55e" />
              </View>
              <Text style={styles.blockTitle}>{t("createCustomFood")}</Text>
              <Text style={styles.blockDesc}>{t("createCustomDesc")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* cancel */}
        <TouchableOpacity
          style={[styles.cancelButton, isStep2Active && { opacity: 0.15 }]}
          onPress={onClose}
          activeOpacity={0.7}
          disabled={isStep2Active}
        >
          <Text style={styles.cancelText}>{t("cancel")}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
  },
  blockWrapper: {
    flex: 1,
  },
  highlightedBlock: {
    opacity: 1,
    borderWidth: 2,
    borderColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 10,
    backgroundColor: "#16281a",
  },
  highlightedIconCircle: {
    backgroundColor: "rgba(34,197,94,0.25)",
  },
  dragHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 6,
    borderRadius: 20,
  },
  grid: {
    gap: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  block: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "flex-start",
    width: "100%",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  blockDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 13,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#22c55e",
  },
});
