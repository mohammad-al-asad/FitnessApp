import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LANGUAGE_KEY } from "@/hooks/language-context";

const TRIAL_REMINDER_ID_KEY = "fitco_trial_reminder_notification_id";

// How far in advance of trial end to remind (48 hours = day 2 of a 3-day trial)
const REMINDER_DELAY_SECONDS =2 * 24 * 60 * 60;

// Localized notification content
const NOTIFICATION_CONTENT = {
  en: {
    title: "Keep your nutrition on track 💪",
    body: "Your 3-day free trial ends in 24 hours. Open Fitco to keep tracking your nutrition effortlessly.",
  },
  ar: {
    title: "استمر في متابعة تغذيتك 💪",
    body: "تنتهي فترتك التجريبية المجانية لمدة 3 أيام خلال 24 ساعة. افتح فتكو واستمر في تتبع تغذيتك بكل سهولة.",
  },
} as const;

// Configure foreground notification display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getAppLanguage = async (): Promise<"en" | "ar"> => {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  return stored === "en" ? "en" : "ar";
};

/**
 * Schedules a local notification 48 hours after a free trial purchase
 * to remind the user their trial ends the next day.
 *
 * Safe to call multiple times — cancels any previous reminder first.
 */
export const scheduleTrialReminder = async () => {
  // Cancel any existing reminder to avoid duplicates
  await cancelTrialReminder();

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("[TrialReminder] Notification permission not granted.");
    return;
  }

  const language = await getAppLanguage();
  const content = NOTIFICATION_CONTENT[language];

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMINDER_DELAY_SECONDS,
      repeats: false,
    },
  });

  await AsyncStorage.setItem(TRIAL_REMINDER_ID_KEY, notificationId);
  console.log(
    `[TrialReminder] Scheduled notification (${language}) in ${REMINDER_DELAY_SECONDS}s — id: ${notificationId}`,
  );
};

/**
 * Cancels a previously scheduled trial reminder, if any.
 */
export const cancelTrialReminder = async () => {
  const storedId = await AsyncStorage.getItem(TRIAL_REMINDER_ID_KEY);
  if (storedId) {
    await Notifications.cancelScheduledNotificationAsync(storedId);
    await AsyncStorage.removeItem(TRIAL_REMINDER_ID_KEY);
    console.log(`[TrialReminder] Cancelled notification — id: ${storedId}`);
  }
};
