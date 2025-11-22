import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FoodItemProps {
  loggedFood: any;
  onRemove: (foodId: string) => Promise<void>;
  showRemove?: boolean;
}

export default function FoodItem({ loggedFood, onRemove, showRemove = false }: FoodItemProps) {
  return (
    <View style={styles.container}>
      <Text
  style={[styles.text, { flexShrink: 1, flexWrap: 'wrap', marginRight: 10 }]}
  numberOfLines={2}
>
  {loggedFood.foodItem?.name || "Unnamed Food"}
</Text>

      {showRemove && (
        <TouchableOpacity onPress={() => onRemove(loggedFood.id)}>
          <Text style={styles.remove}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
 text: {
  color: "#fff",
  flex: 1,
},

  remove: {
    color: "#FF6B35",
    fontWeight: "bold",
  },
});
