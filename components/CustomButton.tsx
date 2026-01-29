import { useLanguage } from "@/hooks/language-context";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  text?: string;
  children?: React.ReactNode;
  type?: "outline" | "default";
}
const CustomButton = ({
  text,
  type = "default",
  children,
  style,
  ...props
}: ButtonProps) => {
    const { t } = useLanguage();
  return (
    <TouchableOpacity
      {...props}
      style={[
        styles.button,
        type === "default"
          ? {
              backgroundColor:"#4CB050",
            }
          : {
              backgroundColor: "white",
            },
        style,
      ]}
    >
      {children && children}
      {text && <Text style={styles.text}>{t(text as any)}</Text>}
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    color:"white",
    fontWeight: "semibold",
    fontSize: 18,
  },
});
