import InfoContentScreen from "@/components/InfoContentScreen";
import React from "react";
import { StyleSheet, View } from "react-native";

const Privacy = () => {
  const privacyData = [
    "Lorem ipsum dolor sit amet consectetur. Imperdiet iaculis convallis bibendum massa id elementum consectetur neque mauris.",
    "Lorem ipsum dolor sit amet consectetur. Imperdiet iaculis convallis bibendum massa id elementum consectetur neque mauris.",
    "Lorem ipsum dolor sit amet consectetur. Imperdiet iaculis convallis bibendum massa id elementum consectetur neque mauris.",
    "Lorem ipsum dolor sit amet consectetur. Imperdiet iaculis convallis bibendum massa id elementum consectetur neque mauris.",
    "Lorem ipsum dolor sit amet consectetur. Imperdiet iaculis convallis bibendum massa id elementum consectetur neque mauris.",
  ];
  return (
    <View
      style={{
        backgroundColor: "#1A1A1A",
        flex: 1,
      }}
    >
      <InfoContentScreen title="Privacy Policy" data={privacyData} />
    </View>
  );
};

export default Privacy;

const styles = StyleSheet.create({});
