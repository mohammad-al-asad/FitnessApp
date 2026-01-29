import InfoContentScreen from "@/components/InfoContentScreen";
import React from "react";
import { StyleSheet, View } from "react-native";

export const options = {
  tabBarStyle: { display: "none" },
};
const About = () => {
  const aboutData = [
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
      <InfoContentScreen title="About Us" data={aboutData} />
    </View>
  );
};

export default About;

const styles = StyleSheet.create({});
