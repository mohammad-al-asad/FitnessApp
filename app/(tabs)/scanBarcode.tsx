
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { RefreshCw, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScanBarcode() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = {
  text: "#FFFFFF",
  background: "#1A1A1A",
  primary: "#4CAF50",
  surface: "#2D2D2D",
  border: "#404040",
  placeholder: "#999999",
};


  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!isScanning) return;
    
    console.log('Barcode scanned:', data);
    setScannedCode(data);
    setIsScanning(false);
router.push(`/modal/createCustomFood?barcode=${data}`);



  };

  const handleScanAgain = () => {
    setScannedCode(null);
    setIsScanning(true);
  };

  const handleClose = () => {
    router.back();
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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionMessage, { color: colors.placeholder }]}>
            We need access to your camera to scan barcodes.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>
              Grant Permission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.placeholder }]}>
              Cancel
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
            'qr',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code39',
            'code93',
            'code128',
            'codabar',
            'itf14',
            'pdf417',
            'aztec',
            'datamatrix',
          ],
        }}
      >
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={handleClose}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.scanArea}>
            <View style={[styles.cornerTopLeft, { borderColor: colors.primary }]} />
            <View style={[styles.cornerTopRight, { borderColor: colors.primary }]} />
            <View style={[styles.cornerBottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.cornerBottomRight, { borderColor: colors.primary }]} />
          </View>

          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {isScanning ? 'Align barcode within frame' : 'Barcode detected'}
            </Text>
          </View>
        </View>
      </CameraView>

      {scannedCode && (
        <View style={[styles.resultOverlay, { paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Scanned Barcode
            </Text>
            <Text style={[styles.resultCode, { color: colors.primary }]}>
              {scannedCode}
            </Text>
            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary }]}
              onPress={handleScanAgain}
            >
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.scanAgainButtonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    
     {/* ⭐ MANUAL BARCODE INPUT BOX (add this) ⭐ */}
      <View style={{
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
      }}>
        <TextInput
          placeholder="Enter barcode manually"
          placeholderTextColor={colors.placeholder}
          style={{
            flex: 1,
            backgroundColor: colors.background,
            color: colors.text,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            marginRight: 10,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          keyboardType="numeric"
          value={scannedCode || ""}
          onChangeText={setScannedCode}
        />

        <TouchableOpacity
          onPress={() => {
            if (!scannedCode) return;
            router.push(`/modal/createCustomFood?barcode=${scannedCode}`);
          }}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Use</Text>
        </TouchableOpacity>
      </View>
      {/* ⭐ END MANUAL INPUT BOX ⭐ */}
    
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
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scanArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 250,
    height: 250,
    marginTop: -125,
    marginLeft: -125,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  resultCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultCode: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
