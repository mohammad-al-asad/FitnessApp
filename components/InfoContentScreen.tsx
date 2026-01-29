import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { moderateScale, verticalScale } from "react-native-size-matters";

interface InfoContentScreenProps {
  title: string;
  data: string[];
}

const InfoContentScreen: React.FC<InfoContentScreenProps> = ({
  title,
  data,
}) => {
  return (
    <SafeAreaView>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {data.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            {/* Number Column */}
            <Text style={styles.numberText}>{index + 1}.</Text>

            {/* Text Column */}
            <Text style={styles.contentText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InfoContentScreen;

const styles = StyleSheet.create({
  scrollContent: {
    padding: moderateScale(20),
    paddingTop: verticalScale(10),
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "flex-start", // Aligns number with the top line of text
    marginBottom: verticalScale(20), // Spacing between paragraphs
  },
  numberText: {
    fontSize: moderateScale(14),
    color: "#FFFFFF",
    fontWeight: "500",
    marginRight: moderateScale(8),
    width: moderateScale(20), // Fixed width to align text column perfectly
  },
  contentText: {
    flex: 1, // Takes up remaining space
    fontSize: moderateScale(14),
    color: "#FFFFFF", // Slightly softer black for reading text (or use colors.black)
    lineHeight: verticalScale(20), // Good line height for readability
    textAlign: "justify", // Optional: matches the blocky look of the design
  },
});
