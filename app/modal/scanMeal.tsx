import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import {
  Camera,
  ChevronLeft,
  Coffee,
  Moon,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Zap,
  ZapOff,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { useLanguage } from "@/hooks/language-context";
import { useNutrition } from "@/hooks/nutrition-store";
import {
  AiMealScanResult,
  AiNutritionFacts,
  saveAiMealScan,
  scanAiMeal,
} from "@/services/food-api";

type MealType = "breakfast" | "lunch" | "dinner";

type ResultForm = {
  foodName: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  notes: string;
};

const MIME_TYPE = "image/jpeg";
const SERVING_DESCRIPTION = "1 visible serving";

function stripBase64Prefix(value: string): string {
  const marker = "base64,";
  const markerIndex = value.indexOf(marker);
  return markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value;
}

function numberText(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 10) / 10);
}

function parseMacro(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildNutritionFacts(form: ResultForm): AiNutritionFacts {
  return {
    calories: { value: Math.round(parseMacro(form.calories)), unit: "kcal" },
    protein: { value: parseMacro(form.protein), unit: "g" },
    carbs: { value: parseMacro(form.carbs), unit: "g" },
    fats: { value: parseMacro(form.fats), unit: "g" },
  };
}

function formFromResult(result: AiMealScanResult): ResultForm {
  return {
    foodName: result.foodName,
    calories: numberText(result.calories),
    protein: numberText(result.protein),
    carbs: numberText(result.carbs),
    fats: numberText(result.fats),
    notes: result.notes,
  };
}

export default function ScanMeal() {
  const [permission, requestPermission] = useCameraPermissions();
  const { t, isRTL } = useLanguage();
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [cameraReady, setCameraReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisText, setAnalysisText] = useState(String(t("initializingCamera")));
  const [flashOn, setFlashOn] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<AiMealScanResult | null>(null);
  const [form, setForm] = useState<ResultForm>({
    foodName: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    notes: "",
  });

  const cameraRef = useRef<CameraView | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addFoodToLog } = useNutrition();

  const MEAL_OPTIONS: {
    key: MealType;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
  }[] = [
    { key: "breakfast", label: String(t("breakfast")), icon: Coffee },
    { key: "lunch", label: String(t("lunch")), icon: Sun },
    { key: "dinner", label: String(t("dinner")), icon: Moon },
  ];

  const handleClose = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleToggleFlash = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashOn((prev) => !prev);
  };

  const startProgress = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
  };

  const handleCapture = async () => {
    if (isAnalyzing || !cameraReady || !cameraRef.current) return;

    setIsAnalyzing(true);
    setAnalysisText(String(t("scanningImage")));
    startProgress();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 1,
        exif: false,
        shutterSound: false,
      });
      const imageBase64 = stripBase64Prefix(photo.base64 || "");
      if (!imageBase64) {
        throw new Error(String(t("couldNotReadCapturedImage")));
      }

      setCapturedImageUri(photo.uri);
      setCapturedBase64(imageBase64);
      setAnalysisText(String(t("detectingFoodMacros")));

      const result = await scanAiMeal({
        imageBase64,
        mimeType: MIME_TYPE,
        servingDescription: SERVING_DESCRIPTION,
      });

      setScanResult(result);
      setForm(formFromResult(result));
      setAnalysisText(String(t("mealDetected")));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error("AI meal scan failed:", error);
      Alert.alert(
        String(t("error")),
        error?.message ? String(error.message) : String(t("failedToScanMeal")),
      );
      setCapturedImageUri(null);
      setCapturedBase64(null);
      setScanResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImageUri(null);
    setCapturedBase64(null);
    setScanResult(null);
    setForm({
      foodName: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      notes: "",
    });
    setAnalysisText(String(t("initializingCamera")));
  };

  const handleSave = async () => {
    if (!capturedBase64 || !scanResult) return;
    if (!form.foodName.trim()) {
      Alert.alert(String(t("missingFields")), String(t("fillRequiredFields")));
      return;
    }

    setIsSaving(true);
    try {
      const nutritionFacts = buildNutritionFacts(form);
      const response = await saveAiMealScan({
        meal: selectedMeal,
        imageBase64: capturedBase64,
        mimeType: MIME_TYPE,
        foodName: form.foodName.trim(),
        confidence: scanResult.confidence,
        nutritionFacts,
        notes: form.notes.trim() || scanResult.notes,
      });

      const savedLog = response.foodLog;
      await addFoodToLog(
        {
          name: savedLog?.foodName || form.foodName.trim(),
          brand: savedLog?.brandName || "AI Meal",
          calories: savedLog?.calories ?? nutritionFacts.calories.value,
          protein: savedLog?.protein ?? nutritionFacts.protein.value,
          carbs: savedLog?.carbs ?? nutritionFacts.carbs.value,
          fats: savedLog?.fat ?? nutritionFacts.fats.value,
          servingSize: scanResult.servingSize || SERVING_DESCRIPTION,
          imageUrl: savedLog?.imageUrl,
          confidence: savedLog?.confidence ?? scanResult.confidence,
          notes: savedLog?.notes ?? form.notes,
          source: "ai",
          isAi: true,
        },
        1,
        undefined,
        savedLog?.meal || selectedMeal,
        savedLog?.id,
      );

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
      router.replace("/(tabs)/journal");
    } catch (error: any) {
      console.error("Saving AI meal failed:", error);
      Alert.alert(
        String(t("error")),
        error?.message ? String(error.message) : String(t("failedToSaveFood")),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderMealPicker = (compact = false) => (
    <View style={[styles.mealPicker, compact && styles.mealPickerCompact]}>
      {MEAL_OPTIONS.map((meal) => {
        const MealIcon = meal.icon;
        const isSelected = selectedMeal === meal.key;
        return (
          <TouchableOpacity
            key={meal.key}
            style={[styles.mealOption, isSelected && styles.mealOptionActive]}
            onPress={() => setSelectedMeal(meal.key)}
            activeOpacity={0.75}
          >
            <MealIcon
              size={16}
              color={isSelected ? colors.background : colors.text}
            />
            <Text
              style={[
                styles.mealOptionText,
                isSelected && styles.mealOptionTextActive,
              ]}
              numberOfLines={1}
            >
              {meal.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.container,
          styles.permissionContainer,
          { paddingTop: insets.top },
        ]}
      >
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>
            {t("cameraPermissionRequired")}
          </Text>
          <Text style={styles.permissionDesc}>
            {t("cameraMealPermissionDescription")}
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>{t("enableCamera")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (scanResult && capturedImageUri) {
    const nutritionFacts = buildNutritionFacts(form);
    const macroInputs = [
      {
        key: "calories",
        label: String(t("caloriesLabel")),
        unit: String(t("kcal")),
        value: form.calories,
        color: "#EF4444",
      },
      {
        key: "protein",
        label: String(t("protein")),
        unit: String(t("g")),
        value: form.protein,
        color: "#1E90FF",
      },
      {
        key: "carbs",
        label: String(t("carbs")),
        unit: String(t("g")),
        value: form.carbs,
        color: "#F4C542",
      },
      {
        key: "fats",
        label: String(t("fats")),
        unit: String(t("g")),
        value: form.fats,
        color: "#9B59B6",
      },
    ] as const;

    return (
      <KeyboardAvoidingView
        style={[styles.resultContainer, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.resultHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={handleRetake}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.resultHeaderTitle}>
            {t("aiMealResultTitle")}
          </Text>
          <View style={styles.placeholderIcon} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.resultContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
        >
          <View style={styles.previewCard}>
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
            <View style={styles.previewBadge}>
              <Sparkles size={15} color="#FFF" />
              <Text style={styles.previewBadgeText}>
                {Math.round(scanResult.confidence * 100)}% {t("confidence")}
              </Text>
            </View>
          </View>

          <View style={styles.resultSection}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
              {t("meal")}
            </Text>
            {renderMealPicker(true)}
          </View>

          <View style={styles.resultSection}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
              {t("foodName")}
            </Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlInput]}
              value={form.foodName}
              onChangeText={(foodName) =>
                setForm((prev) => ({ ...prev, foodName }))
              }
              placeholder={String(t("foodNamePlaceholder"))}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.macroGrid}>
            {macroInputs.map((macro) => (
              <View key={macro.key} style={styles.macroInputCard}>
                <View style={styles.macroLabelRow}>
                  <View
                    style={[
                      styles.macroDot,
                      { backgroundColor: macro.color },
                    ]}
                  />
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={[styles.macroInput, isRTL && styles.rtlInput]}
                    value={macro.value}
                    onChangeText={(value) =>
                      setForm((prev) => ({ ...prev, [macro.key]: value }))
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={styles.macroUnit}>{macro.unit}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.notesCard}>
            <Text
              style={[
                styles.notesText,
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {form.notes || scanResult.notes || t("estimatedMealImageNote")}
            </Text>
          </View>

          <View style={[styles.totalCard,{alignItems:"flex-start"}]}>
            <Text
              style={[
                styles.totalLabel,
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("totalForThisFood")}
            </Text>
            <Text
              style={[
                styles.totalCalories,
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {nutritionFacts.calories.value} {t("kcal")}
            </Text>
            <Text
              style={[
                styles.totalMacros,
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {nutritionFacts.protein.value}
              {t("g")} {t("protein")} | {nutritionFacts.carbs.value}
              {t("g")} {t("carbs")} | {nutritionFacts.fats.value}
              {t("g")} {t("fats")}
            </Text>
          </View>
        </ScrollView>

        <View
          style={[
            styles.saveBar,
            isRTL && { flexDirection: "row-reverse" },
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleRetake}
            disabled={isSaving}
          >
            <RotateCcw size={18} color={colors.text} />
            <Text style={styles.secondaryActionText}>{t("retake")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Save size={18} color={colors.background} />
                <Text style={styles.saveButtonText}>
                  {t("addTo")}{" "}
                  {MEAL_OPTIONS.find((meal) => meal.key === selectedMeal)?.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        mode="picture"
        onCameraReady={() => setCameraReady(true)}
      />

      <View style={[styles.cameraOverlay, { direction: "ltr" }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.floatingBackButton,
            {
              top: insets.top + 12,
              left: 16,
            },
          ]}
          onPress={handleClose}
          activeOpacity={0.75}
        >
          <ChevronLeft size={26} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.scanWrapper}>
          <View style={styles.logoRow}>
            <Text style={styles.logoLetter}>FITCO</Text>
          </View>

          <View style={[styles.scanBox, { direction: "ltr" }]}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            {t("alignMealWithinBrackets")}
          </Text>
        </View>

        <View
          style={[
            styles.bottomPanel,
            { paddingBottom: insets.bottom + 18, direction: isRTL ? "rtl" : "ltr" },
          ]}
        >
          <Text style={styles.mealPickerLabel}>{t("logThisMealAs")}</Text>
          {renderMealPicker()}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.secondaryCircleBtn}
              onPress={handleToggleFlash}
            >
              {flashOn ? (
                <Zap size={22} color={colors.primary} fill={colors.primary} />
              ) : (
                <ZapOff size={22} color="#FFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shutterContainer,
                (!cameraReady || isAnalyzing) && styles.disabledButton,
              ]}
              onPress={handleCapture}
              disabled={!cameraReady || isAnalyzing}
            >
              <View style={styles.shutterOuter}>
                {isAnalyzing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Camera size={28} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.secondaryCircleBtnPlaceholder} />
          </View>
        </View>
      </View>

      {isAnalyzing && (
        <View style={styles.processingOverlay}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.processingTitle}>{analysisText}</Text>
          <Text style={styles.processingSubtitle}>
            {t("estimatingMacros")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#121212",
  },
  permissionCard: {
    backgroundColor: "#1a1a1a",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 10,
    textAlign: "center",
  },
  permissionDesc: {
    fontSize: 14,
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  permissionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
  },
  floatingBackButton: {
    position: "absolute",
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  placeholderIcon: {
    width: 40,
  },
  scanWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop:10
  },
  logoRow: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logoLetter: {
    fontSize: 35,
    fontWeight: "900",
    color: colors.primary,
    marginHorizontal: 1,
    writingDirection: "ltr",
    textShadowColor: "rgba(76, 175, 80, 0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  scanBox: {
    width: "84%",
    maxWidth: 360,
    aspectRatio: 0.86,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  instruction: {
    marginTop: 20,
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "600",
  },
  bottomPanel: {
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  mealPickerLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  mealPicker: {
    flexDirection: "row",
    gap: 8,
  },
  mealPickerCompact: {
    marginTop: 2,
  },
  mealOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  mealOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  mealOptionTextActive: {
    color: colors.background,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: 16,
  },
  secondaryCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryCircleBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  shutterContainer: {
    width: 76,
    height: 76,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  tourBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 9000,
  },
  tourCardContainer: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 10000,
    width: "100%",
  },
  shutterPulseRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOpacity: 0.85,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 20,
    zIndex: 9999,
  },
  elevatedShutter: {
    zIndex: 10000,
    elevation: 25,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#09090b",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    paddingHorizontal: 32,
  },
  progressTrack: {
    direction: "ltr",
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 6,
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: 13,
    color: "#71717a",
    textAlign: "center",
  },
  resultContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  resultHeader: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultHeaderTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  resultContent: {
    padding: 20,
  },
  previewCard: {
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: 22,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  previewBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  resultSection: {
    marginBottom: 18,
  },
  inputLabel: {
    color: colors.placeholder,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  textInput: {
    minHeight: 50,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "600",
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  macroInputCard: {
    width: "48%",
    minHeight: 96,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  macroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  macroDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  macroLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  macroInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  macroInput: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    paddingVertical: 0,
  },
  macroUnit: {
    color: colors.placeholder,
    fontSize: 12,
    fontWeight: "700",
    paddingBottom: 3,
  },
  notesCard: {
    backgroundColor: "rgba(76,175,80,0.1)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.22)",
  },
  notesText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  totalLabel: {
    color: colors.placeholder,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  totalCalories: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
  },
  totalMacros: {
    color: colors.placeholder,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryAction: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.65,
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  rtlInput: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
