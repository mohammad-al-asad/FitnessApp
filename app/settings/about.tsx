// Displays the About screen — provides app information, features, credits, and development details with multilingual support.
import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/language-context';
import { Heart, Info, Star } from 'lucide-react-native';


import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";


import { Image } from "react-native";



export default function AboutScreen() {
  const { t, isRTL } = useLanguage();
const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top - 15 }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* App Info Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Info size={20} color={Colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('appInformation')}</Text>
          </View>

          <View style={styles.appInfo}>
            <Text style={[styles.appName, isRTL && styles.rtlText]}>{t('appName')}</Text>
            <Text style={[styles.appVersion, isRTL && styles.rtlText]}>{t('version')}</Text>
            <Text style={[styles.appDescription, isRTL && styles.rtlText]}>
              {t('yourNutritionCompanion')}
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Star size={20} color={Colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('features')}</Text>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={[styles.featureText, isRTL && styles.rtlText]}>
                {t('trackDailyCalories')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureText, isRTL && styles.rtlText]}>
                {t('setPersonalizedGoals')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureText, isRTL && styles.rtlText]}>
                {t('monitorProgress')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureText, isRTL && styles.rtlText]}>
                {t('keepFoodJournal')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureText, isRTL && styles.rtlText]}>
                {t('multiLanguageSupport')}
              </Text>
            </View>
          </View>
        </View>

       


{/* Connect With Us Section */}
<View style={styles.section}>
  <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
    <Info size={20} color={Colors.primary} />
    <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
      {t("connectWithUs")}
    </Text>
  </View>

  <View style={styles.socialLinks}>
    <View style={styles.socialItem}>
      <Image source={require("@/assets/icons/instagram.png")} style={styles.socialIcon} />
      <Text style={styles.socialText}>fitco.ksa</Text>
    </View>
    <View style={styles.socialItem}>
      <Image source={require("@/assets/icons/tiktok.png")} style={styles.socialIcon} />
      <Text style={styles.socialText}>fitco.tiktok</Text>
    </View>
    <View style={styles.socialItem}>
      <Image source={require("@/assets/icons/snapchat.png")} style={styles.socialIcon} />
      <Text style={styles.socialText}>fitco.snap</Text>
    </View>
  </View>
</View>





        {/* Credits Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Heart size={20} color={Colors.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('madeWithLove')}</Text>
          </View>

          <Text style={[styles.creditsText, isRTL && styles.rtlText]}>
            {t('thankYouForUsing')}
          </Text>
        </View>

        {/* Technical Info */}
        <View style={styles.technicalInfo}>
          <Text style={[styles.technicalText, isRTL && styles.rtlText]}>
            React Native • Expo • TypeScript
          </Text>
          <Text style={[styles.technicalText, isRTL && styles.rtlText]}>
            {t('version')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: Colors.placeholder,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  developmentText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  creditsText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  technicalInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 8,
  },
  technicalText: {
    fontSize: 14,
    color: Colors.placeholder,
    marginBottom: 4,
  },
  // RTL Styles
  rtlText: {
    textAlign: 'right',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },


socialLinks: {
  marginTop: 10,
  gap: 12,
},
socialItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},
socialIcon: {
  width: 22,
  height: 22,
  borderRadius: 6,
},
socialText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "500",
},




});
