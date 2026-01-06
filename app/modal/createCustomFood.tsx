import colors from '@/constants/colors';
import { useLanguage } from '@/hooks/language-context';
import { addFoodToSheet, getFoodByBarcode } from '@/services/googleSheetService';
import { responsiveHeight, responsiveWidth } from '@/utilities/ScalingUtils';
import Barcode from '@alexartisan/react-native-barcode-builder';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Save, ScanBarcode, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
  const { t, isRTL } = useLanguage();
  const [keyboardHeight, setKeyboardHeight] = useState(0);


// STEP 2: read barcode coming from scanner
const params = useLocalSearchParams();

useEffect(() => {
  const showListener = Keyboard.addListener(
    'keyboardDidShow',
    (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    }
  );

  const hideListener = Keyboard.addListener(
    'keyboardDidHide',
    () => {
      setKeyboardHeight(0);
    }
  );

  return () => {
    showListener.remove();
    hideListener.remove();
  };
}, []);

useEffect(() => {
  const lookupFood = async () => {
    if (params.barcode && !barcode) {
      const scannedBarcode = params.barcode.toString();
      setBarcode(scannedBarcode);

      const existingFood = await getFoodByBarcode(scannedBarcode);


      if (existingFood) {
        setFoodName(existingFood.PRODUCT || '');
        setBrandName(existingFood.BRAND || '');
        setServingSize(existingFood["SERVING SIZE"] || '');
        setCalories(existingFood.CALORIES?.toString() || '');
        setProtein(existingFood.PROTEIN?.toString() || '');
        setCarbs(existingFood.CARBS?.toString() || '');
        setFats(existingFood.FAT?.toString() || '');
      }
    }
  };

  lookupFood();
}, [params.barcode, barcode]);




  const handleSave = async () => {
    if (!foodName || !calories) {
      Alert.alert(t('missingFields') as string, t('fillRequiredFields') as string);
      return;
    }
    if (!servingSize || !servingSize.match(/^\d+(?:g|ml)?$/)) {
      Alert.alert(t('invalidServingSize') as string, t('pleaseEnterValidServingSize') as string);
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


      Alert.alert(t('success') as string, t('foodAddedToDatabase') as string);
      router.back();
    } catch (error) {
      Alert.alert(t('error') as string, t('failedToSaveFood') as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, paddingBottom: keyboardHeight }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen 
        options={{ 
          title: t('createCustomFood'),
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('createFoodTitle')}</Text>
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
          onPress={() => router.push('/scanBarcode?source=createCustom')}



        >
          <View style={[styles.scannerIcon, { backgroundColor: colors.primary + '20' }]}>
            <ScanBarcode size={28} color={colors.primary} />
          </View>
          <View style={styles.scannerContent}>
            <Text style={[styles.scannerTitle, { color: colors.text }]}>{t('scanBarcode')}</Text>
            <Text style={[styles.scannerSubtitle, { color: colors.placeholder }]}>
              {t('quickWayToAddFoodInfo')}
            </Text>
          </View>
        </TouchableOpacity>

        {barcode && (
          <View style={styles.barcodeContainer}>
        <Barcode value={barcode} format="CODE128" text={barcode}  />
        </View>
        )}

        {/* Food Information Section */}
        <View style={[styles.section, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text,textAlign: 'left' }]}>{t('basicInformation')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.placeholder,textAlign: 'left' }]}>{t('foodName')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border,textAlign: isRTL ? 'right' : 'left' }]}
              value={foodName}
              onChangeText={setFoodName}
              placeholder={t('foodNamePlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.placeholder,textAlign: 'left' }]}>{t('brandOptional')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border,textAlign: isRTL ? 'right' : 'left' }]}
              value={brandName}
              onChangeText={setBrandName}
              placeholder={t('brandOptionalPlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.placeholder,textAlign: 'left' }]}>{t('servingSize')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border,textAlign: isRTL ? 'right' : 'left' }]}
              value={servingSize}
              onChangeText={setServingSize}
              placeholder={t('servingSizePlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Macronutrients Section */}
        <View style={[styles.section, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text,textAlign: 'left' }]}>{t('nutritionFacts')}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.placeholder,textAlign: 'left' }]}>
            {t('perServing')}
          </Text>

          {/* Macro Inputs */}
          {[
            { label: t('caloriesLabel'), color: '#EF4444', value: calories, setValue: setCalories, unit: t('kcal') },
            { label: t('protein'), color: '#1E90FF', value: protein, setValue: setProtein, unit: t('g') },
            { label: t('carbs'), color: '#F4C542', value: carbs, setValue: setCarbs, unit: t('g') },
            { label: t('fats'), color: '#9B59B6', value: fats, setValue: setFats, unit: t('g') },
          ].map((macro, index) => (
            <View key={index} style={[styles.macroCard, { backgroundColor: colors.surface,direction: isRTL ? 'rtl' : 'ltr' }]}>
              <View style={styles.macroCardContent}>
                <View style={[styles.macroIconContainer, { backgroundColor: macro.color + '20' }]}>
                  <View style={[styles.macroIconDot, { backgroundColor: macro.color }]} />
                </View>
                <View style={[styles.macroInfo,{alignItems: isRTL ? 'flex-start' : 'flex-start', paddingRight: isRTL && Platform.OS === 'ios' ? responsiveWidth(3) : 0 }]}>
                  <Text style={[styles.macroLabel, { color: colors.text }]}>{macro.label}</Text>
                  <Text style={[styles.macroUnit, { color: colors.placeholder }]}>{macro.unit}</Text>
                </View>
              </View>
              <TextInput
                style={[styles.macroInput, { color: colors.text,textAlign: isRTL ? 'right' : 'left' }]}
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
      <View style={[styles.saveButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: keyboardHeight + 20 }]}>
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
                {t('saveCustomFood')}
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
  content: { flex: 1, paddingTop: 20, marginHorizontal: 20, },
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
  rtlSection: {
    flexDirection: 'row-reverse',
  },
  barcodeContainer: {
    paddingVertical: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(1),
    marginBottom: responsiveHeight(1),
  },
});
