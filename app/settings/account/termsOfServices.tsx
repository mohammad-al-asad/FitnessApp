import InfoContentScreen from "@/components/InfoContentScreen";
import React from "react";
import { View } from "react-native";

const Terms = () => {
  const termsData = [
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
      <InfoContentScreen title="Terms Of Services" data={termsData} />
    </View>
  );
};

export default Terms;
