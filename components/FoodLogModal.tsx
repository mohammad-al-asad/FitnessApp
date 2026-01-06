// FoodLogModal — sleek Fitco bottom drawer
import { useLanguage } from "@/hooks/language-context";
import { BookOpen, Plus, QrCode, X } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogFood: () => void;
  onScanBarcode: () => void;
  onCreateCustom: () => void;
}

export default function FoodLogModal({
  visible,
  onClose,
  onLogFood,
  onScanBarcode,
  onCreateCustom,
}: Props) {
  const insets = useSafeAreaInsets();

  const { t, isRTL } = useLanguage();

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      useNativeDriver
      backdropTransitionOutTiming={0}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={280}
      animationOutTiming={220}
      backdropColor="rgba(0,0,0,0.5)"
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('addFoodMenu')}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <X size={22} color="#22c55e" />
          </TouchableOpacity>
        </View>

        {/* options */}
        <TouchableOpacity
          style={styles.option}
          onPress={onLogFood}
          activeOpacity={0.8}
        >
          <BookOpen size={22} color="#22c55e" />
          <Text style={[styles.optionText, isRTL && styles.rtlOptionText]}>{t('logFood')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={onCreateCustom}
          activeOpacity={0.8}
        >
          <Plus size={22} color="#22c55e" />
          <Text style={[styles.optionText, isRTL && styles.rtlOptionText]}>{t('createCustomFood')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={onScanBarcode}
          activeOpacity={0.8}
        >
          <QrCode size={22} color="#22c55e" />
          <Text style={[styles.optionText, isRTL && styles.rtlOptionText]}>{t('scanBarcode')}</Text>
        </TouchableOpacity>

        {/* cancel */}
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>{t('cancel')}</Text>
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
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
  },
  dragHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  optionText: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 12,
  },
  rtlOptionText: {
    marginLeft: 0,
    marginRight: 12,
  },
  cancelButton: {
    marginTop: 18,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22c55e",
  },
});
