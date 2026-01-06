// Manages user preferences — language selection, notification settings, and reminder time customization with real-time save and RTL support.
import { useLanguage } from '@/hooks/language-context';
import { useNutrition } from '@/hooks/nutrition-store';
import { Bell, Globe, Save } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserSettings = any;
export default function PreferencesScreen() {
  const { settings, saveSettings } = useNutrition();
  const { t, currentLanguage, changeLanguage, colors, isRTL } = useLanguage();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
const insets = useSafeAreaInsets();

console.log(currentLanguage);

useEffect(() => {
  setLocalSettings((prev: UserSettings) => ({ ...prev, language: currentLanguage }));
}, [currentLanguage]);

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setLocalSettings((prev: UserSettings) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setHasChanges(false);
      await saveSettings(localSettings);
      
      // Handle language change separately to ensure proper RTL layout update
      if (localSettings.language !== currentLanguage) {
        console.log(`Changing language from ${currentLanguage} to ${localSettings.language}`);
        await changeLanguage(localSettings.language);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Re-enable save button if there was an error
      setHasChanges(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top - 15 }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Globe size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText, { color: colors.text }]}>{t('language')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.rtlText, { color: colors.text }]}>{t('selectLanguage')}</Text>
            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  { borderColor: colors.border },
                  localSettings.language === 'en' && { borderColor: colors.primary, backgroundColor: colors.border }
                ]}
                onPress={() => updateSetting('language', 'en')}
              >
                <Text style={[
                  styles.languageOptionText,
                  { color: colors.text },
                  localSettings.language === 'en' && { color: colors.primary, fontWeight: '600' }
                ]}>{t('english')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  { borderColor: colors.border },
                  localSettings.language === 'ar' && { borderColor: colors.primary, backgroundColor: colors.border }
                ]}
                onPress={() => updateSetting('language', 'ar')}
              >
                <Text style={[
                  styles.languageOptionText,
                  { color: colors.text },
                  localSettings.language === 'ar' && { color: colors.primary, fontWeight: '600' }
                ]}>{t('arabic')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
  

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Save size={20} color={colors.background} />
              <Text style={[styles.saveButtonText, { color: colors.background }]}>{t('saveChanges')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 14,
    marginTop: 4,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },

  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
  },
  saveContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // RTL Styles
  rtlText: {
    textAlign: 'left',
  },
  rtlRow: {
    flexDirection: 'row',
  },
  rtlInput: {
    textAlign: 'right',
  },
});
