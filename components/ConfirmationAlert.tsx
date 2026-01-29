import { useLanguage } from "@/hooks/language-context";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { moderateScale, scale } from "react-native-size-matters";
interface ConfirmationAlertProps {
  visible: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmationAlert = ({
  visible,
  message = "Are you sure?",
  onConfirm,
  onCancel,
}: ConfirmationAlertProps) => {
  const {t} = useLanguage();
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.message}>{t(message as any) }</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>{t("confirm")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get("window");
const alertWidth = Math.min(width * 0.85, 320);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(85, 85, 85, 0.518)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: alertWidth,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: moderateScale(8),
    width:scale(200),
    paddingHorizontal: scale(20),
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#4CB050",
  },
  confirmButton: {
    backgroundColor: "red",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CB050",
    textAlign: "center",
  },
  confirmButtonText: {
    textAlign: "center",
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ConfirmationAlert;
