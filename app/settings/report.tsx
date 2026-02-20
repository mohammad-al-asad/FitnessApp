import { useLanguage, useSafeColors } from "@/hooks/language-context";
import { backendSubmitReport } from "@/services/backend-auth";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ReportIssueScreen = () => {
  const { t, isRTL } = useLanguage();
  const colors = useSafeColors();

  const [selectedType, setSelectedType] = useState("app");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("John Smith"); // Mock initial value
  const [email, setEmail] = useState("jackson.graham@example.com");
  const [submitting, setSubmitting] = useState(false);

  const issueTypes = [
    { id: "app", label: t("appNotWorking"), icon: "cellphone" },
    { id: "payment", label: t("paymentIssue"), icon: "credit-card-outline" },
    { id: "chat", label: t("chatProblem"), icon: "chat-outline" },
    { id: "barcode", label: t("barcodeIssue"), icon: "barcode-scan" },
    { id: "sub", label: t("subscriptionIssue"), icon: "crown-outline" },
    { id: "others", label: t("others"), icon: "dots-horizontal" },
  ];

  const issueTypeMap: Record<string, string> = {
    app: "App",
    payment: "Payment",
    chat: "Chat",
    barcode: "Barcode",
    sub: "Subscription",
    others: "Others",
  };

  const handleSubmit = async () => {
    const desc = description.trim();
    const userEmail = email.trim();
    const userName = name.trim();

    if (!desc) {
      Alert.alert("Error", "Please describe your issue.");
      return;
    }

    if (!userEmail) {
      Alert.alert("Error", "Please provide contact email.");
      return;
    }

    try {
      setSubmitting(true);
      await backendSubmitReport({
        issueType: issueTypeMap[selectedType] || "Others",
        description: desc,
        contactInfo: userName ? `${userName} <${userEmail}>` : userEmail,
      });
      setDescription("");
      Alert.alert("Success", "Report submitted successfully.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Issue Type Section */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
              marginTop: 0,
            },
          ]}
        >
          {t("issueType")}
        </Text>

        <View style={styles.listContainer}>
          {issueTypes.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.typeItem,
                {
                  backgroundColor: colors.surface,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={() => setSelectedType(item.id)}
            >
              <View
                style={[
                  styles.radioContainer,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <Ionicons
                  name={
                    selectedType === item.id
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={22}
                  color={
                    selectedType === item.id ? "#4CAF50" : colors.placeholder
                  }
                />
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={22}
                  color={colors.placeholder}
                  style={{ marginHorizontal: 12 }}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  { color: colors.text, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("describeYourIssue")}
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
          placeholder={t("describePlaceholder") as string}
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
        />

        {/* Contact Info Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t("contactInfo")}
        </Text>

        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.inputLabel,
              { color: colors.text, textAlign: isRTL ? "right" : "left" },
            ]}
          >
            {t("name")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.inputLabel,
              { color: colors.text, textAlign: isRTL ? "right" : "left" },
            ]}
          >
            {t("email")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: "#4CAF50" }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? String(t("pleaseWait")) : String(t("submitReport"))}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
  },
  listContainer: { gap: 10 },
  typeItem: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  radioContainer: { alignItems: "center" },
  typeLabel: { flex: 1, fontSize: 16 },
  textArea: {
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: "top",
    fontSize: 15,
  },
  inputGroup: { marginTop: 16 },
  inputLabel: { fontSize: 15, marginBottom: 8 },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  submitButton: {
    marginTop: 40,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: { color: "#000", fontSize: 18, fontWeight: "bold" },
});

export default ReportIssueScreen;
