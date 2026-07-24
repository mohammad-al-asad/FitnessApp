// Add Meal Screen - similar to CreateCustomFood but without brand and serving size fields
import colors from "@/constants/colors";
import { useLanguage } from "@/hooks/language-context";
import { createCustomFood, getFoodByBarcode } from "@/services/food-api";
import { responsiveHeight, responsiveWidth } from "@/utilities/ScalingUtils";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Save, X, Sparkles } from "lucide-react-native";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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

export default function AddMealScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [foodName, setFoodName] = useState(() => (params.foodName as string) || "");
  const [calories, setCalories] = useState(() => (params.calories as string) || "");
  const [barcode, setBarcode] = useState(() => (params.barcode as string) || "");
  const [protein, setProtein] = useState(() => (params.protein as string) || "");
  const [carbs, setCarbs] = useState(() => (params.carbs as string) || "");
  const [fats, setFats] = useState(() => (params.fats as string) || "");
  const [loading, setLoading] = useState(false);
  const { t, isRTL } = useLanguage();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Optional barcode lookup – same behaviour as original screen
  useEffect(() => {
    const lookupFood = async () => {
      if (params.barcode && !barcode) {
        const scannedBarcode = params.barcode.toString();
        setBarcode(scannedBarcode);
        try {
          const existingFood = await getFoodByBarcode(scannedBarcode);
          if (existingFood) {
            setFoodName(existingFood.name || "");
            setCalories(existingFood.calories?.toString() || "");
            setProtein(existingFood.protein?.toString() || "");
            setCarbs(existingFood.carbs?.toString() || "");
            setFats(existingFood.fats?.toString() || "");
          }
        } catch (error) {
          console.warn("Barcode lookup failed:", error);
        }
      }
    };
    lookupFood();
  }, [params.barcode, barcode]);

  const handleSave = async () => {
    if (!foodName || !calories) {
      Alert.alert(t("missingFields") as string, t("fillRequiredFields") as string);
      return;
    }
    setLoading(true);
    try {
      await createCustomFood({
        barcode: barcode.trim() || undefined,
        foodName: foodName.trim(),
        servingSize: "1 serving",
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fats) || 0,
      });
      Alert.alert(t("success") as string, t("foodAddedToDatabase") as string);
      router.back();
    } catch (error: any) {
      Alert.alert(
        t("error") as string,
        error?.message ? String(error.message) : (t("failedToSaveFood") as string),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.background,
          paddingBottom: keyboardHeight,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: t("addFoodTitle") as string,
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            router.dismissAll();
            router.replace("/(tabs)/home");
          }}
          activeOpacity={0.7}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("addFoodTitle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {params.foodName ? (
          <View style={[styles.scannedImageContainer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80" }}
              style={styles.scannedImage}
              contentFit="cover"
            />
            <View style={styles.scannedImageOverlay}>
              <Sparkles size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.scannedImageText}>AI Scanned Meal Preview</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.scannerCard, { backgroundColor: colors.surface, borderColor: colors.primary }]} />
        )}

        {/* Food Information Section */}
        <View style={[styles.section, { direction: isRTL ? "rtl" : "ltr" }]}>

          {/* Food Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: "left" }]}>{t("foodName")}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign: isRTL ? "right" : "left" }]}
              value={foodName}
              onChangeText={setFoodName}
              placeholder={t("foodNamePlaceholder") as string}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {/* Macronutrients Section */}
          <View style={[styles.section, { direction: isRTL ? "rtl" : "ltr" }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: "left" }]}>{t("nutritionFacts")}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.placeholder, textAlign: "left" }]}>{t("perServing")}</Text>
            {[{ label: t("caloriesLabel"), color: "#EF4444", value: calories, setValue: setCalories, unit: t("kcal") },
              { label: t("protein"), color: "#1E90FF", value: protein, setValue: setProtein, unit: t("g") },
              { label: t("carbs"), color: "#F4C542", value: carbs, setValue: setCarbs, unit: t("g") },
              { label: t("fats"), color: "#9B59B6", value: fats, setValue: setFats, unit: t("g") },
            ].map((macro, index) => (
              <View key={index} style={[styles.macroCard, { backgroundColor: colors.surface, direction: isRTL ? "rtl" : "ltr" }]}>
                <View style={styles.macroCardContent}>
                  <View style={[styles.macroIconContainer, { backgroundColor: macro.color + "20" }]}>
                    <View style={[styles.macroIconDot, { backgroundColor: macro.color }]} />
                  </View>
                  <View style={[styles.macroInfo, { alignItems: "flex-start", paddingRight: isRTL && Platform.OS === "ios" ? responsiveWidth(3) : 0 }]}>
                    <Text style={[styles.macroLabel, { color: colors.text }]}>{macro.label}</Text>
                    <Text style={[styles.macroUnit, { color: colors.placeholder }]}>{macro.unit}</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.macroInput, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
                  value={macro.value}
                  onChangeText={macro.setValue}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.saveButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: keyboardHeight + 20 }]}>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} activeOpacity={0.8} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Save size={20} color={colors.background} />
              <Text style={[styles.saveButtonText, { color: colors.background }]}>{t("saveCustomFood")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  closeButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  content: { flex: 1, paddingTop: 20, marginHorizontal: 20 },
  scannedImageContainer: { height: 180, borderRadius: 20, overflow: "hidden", marginBottom: 28, borderWidth: 1.5, borderColor: "rgba(34,197,94,0.3)", position: "relative", shadowColor: "#22c55e", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 },
  scannedImage: { width: "100%", height: "100%" },
  scannedImageOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", paddingVertical: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  scannedImageText: { color: "#FFF", fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  scannerCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 20, marginBottom: 32, borderWidth: 2, borderStyle: "dashed" },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "500", marginBottom: 8, letterSpacing: 0.3 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
  macroCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 16, marginBottom: 12 },
  macroCardContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  macroIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  macroIconDot: { width: 12, height: 12, borderRadius: 6 },
  macroInfo: { flex: 1 },
  macroLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  macroUnit: { fontSize: 12 },
  macroInput: { fontSize: 20, fontWeight: "700", minWidth: 60, textAlign: "right" },
  saveButtonContainer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 16, gap: 8 },
  saveButtonText: { fontSize: 16, fontWeight: "600", letterSpacing: 0.3 },
});
