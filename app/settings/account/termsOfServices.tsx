import InfoContentScreen from "@/components/InfoContentScreen";
import { backendGetPublicCms } from "@/services/backend-auth";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const Terms = () => {
  const [title, setTitle] = useState("Terms Of Services");
  const [termsData, setTermsData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const cms = await backendGetPublicCms("terms");
        setTitle(cms.title || "Terms Of Services");
        const chunks = cms.content
          .split(/\n+/)
          .map((x) => x.trim())
          .filter(Boolean);
        setTermsData(chunks.length > 0 ? chunks : [cms.content]);
      } catch (err: any) {
        setError(err?.message || "Failed to load terms.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <View
      style={{
        backgroundColor: "#1A1A1A",
        flex: 1,
      }}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CB050" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <InfoContentScreen title={title} data={termsData} />
      )}
    </View>
  );
};

export default Terms;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  error: {
    color: "#fff",
    textAlign: "center",
  },
});
