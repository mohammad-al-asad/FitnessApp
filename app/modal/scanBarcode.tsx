import { useLanguage } from "@/hooks/language-context";
import { responsiveHeight } from "@/utilities/ScalingUtils";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ScanBarcode() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t, isRTL } = useLanguage();
  const colors = {
    text: "#FFFFFF",
    background: "#1A1A1A",
    primary: "#4CAF50",
    surface: "#2D2D2D",
    border: "#404040",
    placeholder: "#999999",
  };
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardVisible(true);
    });

    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const navigateWithBarcode = async (barcode: string) => {
    const cleanedBarcode = barcode.trim();
    if (!cleanedBarcode) return;

    const source = params.source as string;

    const navigate = () => {
      if (source === "createCustom") {
        router.navigate(`/modal/createCustomFood?barcode=${cleanedBarcode}`);
      } else {
        router.navigate(`/logFood?barcode=${cleanedBarcode}`);
      }
    };

    setIsScanning(false);
    navigate();
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (!isScanning) return;

    setIsScanning(false);
    console.log("Barcode scanned:", data);
    await navigateWithBarcode(data);
  };

  const handleClose = () => {
    router.replace("/(tabs)/home");
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            {t("cameraPermissionRequired")}
          </Text>
          <Text
            style={[styles.permissionMessage, { color: colors.placeholder }]}
          >
            {t("cameraPermissionRequiredDescription")}
          </Text>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: "#FFFFFF" }]}>
              {t("grantPermission")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text
              style={[styles.cancelButtonText, { color: colors.placeholder }]}
            >
              {t("cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code39",
            "code93",
            "code128",
            "codabar",
            "itf14",
            "pdf417",
            "aztec",
            "datamatrix",
          ],
        }}
      >
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={handleClose}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.scanArea}>
            <View
              style={[styles.cornerTopLeft, { borderColor: colors.primary }]}
            />
            <View
              style={[styles.cornerTopRight, { borderColor: colors.primary }]}
            />
            <View
              style={[styles.cornerBottomLeft, { borderColor: colors.primary }]}
            />
            <View
              style={[
                styles.cornerBottomRight,
                { borderColor: colors.primary },
              ]}
            />
          </View>

          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {isScanning ? t("alignBarcodeWithinFrame") : t("barcodeDetected")}
            </Text>
          </View>
        </View>
      </CameraView>


      {/* ? MANUAL BARCODE INPUT BOX (add this) ? */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 20,
          left: 20,
          right: 20,
          backgroundColor: colors.surface,
          padding: 14,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: keyboardVisible
            ? Platform.OS === "ios"
              ? responsiveHeight(25)
              : responsiveHeight(30)
            : 0,
        }}
      >
        <TextInput
          placeholder={t("enterBarcodeManually") as string}
          placeholderTextColor={colors.placeholder}
          style={{
            flex: 1,
            backgroundColor: colors.background,
            color: colors.text,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            marginRight: 10,
            textAlign: isRTL ? "right" : "left",
            borderColor: colors.border,
            borderWidth: 1,
          }}
          keyboardType="numeric"
          value={manualCode}
          onChangeText={setManualCode}
        />

        <TouchableOpacity
          onPress={() => {
            if (isSearching) return;
            if (!manualCode) return;
            void navigateWithBarcode(manualCode);
          }}
          disabled={isSearching}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            opacity: isSearching ? 0.7 : 1,
          }}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600" }}>{t("use")}</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* ? END MANUAL INPUT BOX ? */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scanArea: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 250,
    height: 250,
    marginTop: -125,
    marginLeft: -125,
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    start: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderStartWidth: 4,
    borderTopStartRadius: 8,
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    end: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderEndWidth: 4,
    borderTopEndRadius: 8,
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    start: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderStartWidth: 4,
    borderBottomStartRadius: 8,
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    end: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderEndWidth: 4,
    borderBottomEndRadius: 8,
  },
  instructionContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 130 : 110,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
    width: "100%",
    maxWidth: 360,
  },
  resultOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  resultCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#404040",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  resultCode: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    width: "100%",
  },
  scanAgainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: "center",
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
