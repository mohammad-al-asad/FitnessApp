import { useLanguage } from "@/hooks/language-context";
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

interface CustomInputProps extends React.ComponentProps<typeof TextInput> {
  text?: string;
  placeholder: string;
  icon?: React.ReactNode;
  style?: object;
}

const CustomInput = ({
  text = "",
  placeholder,
  icon,
  style = {},
  ...props
}: CustomInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { t, isRTL } = useLanguage();

  const isPassword =
    text.toLowerCase().includes("password") || props.secureTextEntry === true;

  return (
    <>
      {text && (
        <Text
          style={[
            styles.label,
            {
              textAlign: isRTL ? "left" : "right",
            },
          ]}
        >
          {t(text as any)}
        </Text>
      )}
      <View style={[styles.inputWrapper, style]}>
        {icon && icon}
        <TextInput
          {...props}
          placeholder={placeholder}
          placeholderTextColor="#9E9E9E"
          secureTextEntry={isPassword && !showPassword}
          style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={{
              marginHorizontal: scale(3),
            }}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#9E9E9E"
            />
          </Pressable>
        )}
      </View>
    </>
  );
};

export default CustomInput;

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: moderateScale(50),
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(12),
    backgroundColor: "#2D2D2D",
  },

  icon: {
    marginRight: scale(10),
  },

  input: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "white",
    paddingVertical: 0,
  },

  label: {
    fontSize: moderateScale(13),
    marginBottom: verticalScale(6),
    color: "white",
  },
});
