import colors from '@/constants/colors';
import { addFoodToSheet } from '@/services/googleSheetService';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Save, ScanBarcode, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function CreateCustomFoodScreen() {
  const insets = useSafeAreaInsets();
  
  const [foodName, setFoodName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [barcode, setBarcode] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [loading, setLoading] = useState(false);


// STEP 2: read barcode coming from scanner
const params = useLocalSearchParams();

if (params.barcode && barcode === '') {
  setBarcode(params.barcode.toString());
}




  const handleSave = async () => {
    if (!foodName || !calories) {
      Alert.alert("Missing fields", "Please fill at least the food name and calories.");
      return;
    }

    setLoading(true);
    try {
      await addFoodToSheet({
  brand: brandName,        // goes into BRAND column
  product: foodName,       // goes into PRODUCT column
  serving: servingSize,    // goes into SERVING SIZE column
  calories,
  protein,
  carbs,
  fat: fats,
  barcode: barcode,
});


      Alert.alert("✅ Success", "Food added to your database!");
      router.back();
    } catch (error) {
      Alert.alert("❌ Error", "Failed to save food. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen 
        options={{ 
          title: 'Create Custom Food',
          headerShown: false,
        }} 
      />

      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Food</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Barcode Scanner Card */}
        <TouchableOpacity 
          style={[styles.scannerCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() => router.push('/scanBarcode')}



        >
          <View style={[styles.scannerIcon, { backgroundColor: colors.primary + '20' }]}>
            <ScanBarcode size={28} color={colors.primary} />
          </View>
          <View style={styles.scannerContent}>
            <Text style={[styles.scannerTitle, { color: colors.text }]}>Scan Barcode</Text>
            <Text style={[styles.scannerSubtitle, { color: colors.placeholder }]}>
              Quick way to add food info
            </Text>
          </View>
        </TouchableOpacity>

        {/* Food Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.placeholder }]}>Food Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="e.g., Chicken Breast"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.placeholder }]}>Brand (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={brandName}
              onChangeText={setBrandName}
              placeholder="e.g., Almarai"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.placeholder }]}>Serving Size *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={servingSize}
              onChangeText={setServingSize}
              placeholder="e.g., 100g or 1 cup"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Macronutrients Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition Facts</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.placeholder }]}>
            Per serving size
          </Text>

          {/* Macro Inputs */}
          {[
            { label: 'Calories', color: '#EF4444', value: calories, setValue: setCalories, unit: 'kcal' },
            { label: 'Protein', color: '#1E90FF', value: protein, setValue: setProtein, unit: 'g' },
            { label: 'Carbs', color: '#F4C542', value: carbs, setValue: setCarbs, unit: 'g' },
            { label: 'Fats', color: '#9B59B6', value: fats, setValue: setFats, unit: 'g' },
          ].map((macro, index) => (
            <View key={index} style={[styles.macroCard, { backgroundColor: colors.surface }]}>
              <View style={styles.macroCardContent}>
                <View style={[styles.macroIconContainer, { backgroundColor: macro.color + '20' }]}>
                  <View style={[styles.macroIconDot, { backgroundColor: macro.color }]} />
                </View>
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroLabel, { color: colors.text }]}>{macro.label}</Text>
                  <Text style={[styles.macroUnit, { color: colors.placeholder }]}>{macro.unit}</Text>
                </View>
              </View>
              <TextInput
                style={[styles.macroInput, { color: colors.text }]}
                value={macro.value}
                onChangeText={macro.setValue}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.saveButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Save size={20} color={colors.background} />
              <Text style={[styles.saveButtonText, { color: colors.background }]}>
                Save Custom Food
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  scannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  scannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scannerContent: { flex: 1 },
  scannerTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  scannerSubtitle: { fontSize: 13 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  macroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  macroCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  macroIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  macroIconDot: { width: 12, height: 12, borderRadius: 6 },
  macroInfo: { flex: 1 },
  macroLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  macroUnit: { fontSize: 12 },
  macroInput: { fontSize: 20, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});
