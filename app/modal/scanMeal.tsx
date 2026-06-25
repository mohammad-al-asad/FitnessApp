import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Sparkles,
  Zap,
  ZapOff,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useLanguage } from "@/hooks/language-context";

const MOCK_MEALS = [
  {
    name: "Grilled Chicken & Jasmine Rice",
    calories: 390,
    protein: 38,
    carbs: 47,
    fats: 5.5,
    brand: "AI Healthy Kitchen",
  },
  {
    name: "Avocado Sourdough Toast with Egg",
    calories: 453,
    protein: 20,
    carbs: 46,
    fats: 25,
    brand: "Fresh Morning Cafe",
  },
  {
    name: "Berry Protein Shake",
    calories: 220,
    protein: 27,
    carbs: 20,
    fats: 4,
    brand: "Fitco Blenders",
  },
];

export default function ScanMeal() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [analysisText, setAnalysisText] = useState("Initializing camera...");
  const [flashOn, setFlashOn] = useState(false);
  
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  const handleClose = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleToggleFlash = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashOn(prev => !prev);
  };

  const handleCapture = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCameraActive(false);
       setIsAnalyzing(true);
       // Reset animation
       progressAnim.setValue(0);
       Animated.timing(progressAnim, {
         toValue: 1,
         duration: 1500,
         useNativeDriver: false,
       }).start();
    setAnalysisText("Scanning image...");

    // Simulated AI analysis sequence
    setTimeout(() => {
      setAnalysisText("Detecting food patterns...");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setTimeout(() => {
        setAnalysisText("Calculating nutritional densities...");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        setTimeout(() => {
          const selectedMeal = MOCK_MEALS[Math.floor(Math.random() * MOCK_MEALS.length)];
          setIsAnalyzing(false);
          // Redirect to the existing createCustomFood screen
          router.replace({
            pathname: "/modal/AddMeal",
            params: {
              foodName: selectedMeal.name,
              calories: String(selectedMeal.calories),
              protein: String(selectedMeal.protein),
              carbs: String(selectedMeal.carbs),
              fats: String(selectedMeal.fats),
            },
          });
        }, 1200);
      }, 1200);
    }, 1000);
  };

  // Scan line vertical translation


  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { paddingTop: insets.top }]}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDesc}>
            Fitco AI needs access to your camera to recognize dishes and log nutrition facts instantly.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {cameraActive && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={flashOn}>
          {/* Top Bar Overlay */}
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.iconButton} onPress={handleClose}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AI Meal Scanner</Text>
            <View style={styles.placeholderIcon} />
          </View>

          {/* Center Scan Area Box */}
          <View style={styles.scanWrapper}>
            {/* FITCO Splash style logo indicator */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              {['F','I','T','C','O'].map((letter, idx) => (
                <Text
                  key={idx}
                  style={{
                    fontSize: 28,
                    fontWeight: "900",
                    color: "#4CAF50",
                    marginHorizontal: 1,
                    letterSpacing: -1,
                    textShadowColor: "rgba(76, 175, 80, 0.4)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 6,
                  }}
                >
                  {letter}
                </Text>
              ))}
            </View>

            <View style={styles.scanBox}>
              {/* Corner brackets overlay */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* Laser line slider */}
  
            </View>
            <Text style={styles.instruction}>Align meal within the brackets</Text>
          </View>

          {/* Shutter bottom bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.secondaryCircleBtn} onPress={handleToggleFlash}>
              {flashOn ? (
                <Zap size={22} color="#4CAF50" fill="#4CAF50" />
              ) : (
                <ZapOff size={22} color="#FFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.shutterContainer} onPress={handleCapture}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </View>
            </TouchableOpacity>

            <View style={styles.secondaryCircleBtnPlaceholder} />
          </View>
        </CameraView>
      )}

      {/* AI Processing Screen */}
      {isAnalyzing && (
        <View style={styles.processingOverlay}>
           <Animated.View style={[styles.progressBar, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          <Text style={styles.processingTitle}>{analysisText}</Text>
          <Text style={styles.processingSubtitle}>Powering up neural network model...</Text>
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
    backgroundColor: "#22c55e",
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  },
  scanBox: {
    width: 360,
    height: 420,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#22c55e",
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
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#22c55e",
    opacity: 0.7,
    shadowColor: "#22c55e",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  instruction: {
    marginTop: 20,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
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
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22c55e",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#09090b",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    paddingHorizontal: 32,
  },
  progressBar: {
    width: "80%",
    height: 8,
    backgroundColor: "#22c55e",
    borderRadius: 4,
    marginBottom: 12,
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
});
