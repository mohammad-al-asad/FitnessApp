// 🧭 guided-tour-context.tsx — Manages step-by-step interactive guide for AI Meal Scanner
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export const TOUR_COMPLETED_KEY = "fitco_ai_meal_scan_tour_completed_v2";

export type TourStep = 0 | 1 | 2;
// Step 0: Inactive
// Step 1: Tap "+" Floating Tab Bar Button
// Step 2: Tap "Meal Scanner" tile in FoodLogModal

export const [GuidedTourProvider, useGuidedTour] = createContextHook(() => {
  const [step, setStep] = useState<TourStep>(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(TOUR_COMPLETED_KEY).then((value) => {
      if (value === "true") {
        setHasCompletedTour(true);
      }
    });
  }, []);

  const startTour = useCallback(() => {
    setStep(1);
    setIsTourActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setStep((prev) => {
      if (prev >= 2) {
        setIsTourActive(false);
        setHasCompletedTour(true);
        void AsyncStorage.setItem(TOUR_COMPLETED_KEY, "true");
        return 0;
      }
      return (prev + 1) as TourStep;
    });
  }, []);

  const setTourStep = useCallback((newStep: TourStep) => {
    if (newStep === 0) {
      setIsTourActive(false);
    } else {
      setIsTourActive(true);
    }
    setStep(newStep);
  }, []);

  const resetTour = useCallback(() => {
    void AsyncStorage.removeItem(TOUR_COMPLETED_KEY);
    setHasCompletedTour(false);
    setStep(1);
    setIsTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setStep(0);
    setIsTourActive(false);
    setHasCompletedTour(true);
    void AsyncStorage.setItem(TOUR_COMPLETED_KEY, "true");
  }, []);

  return {
    step,
    isTourActive,
    hasCompletedTour,
    startTour,
    nextStep,
    setTourStep,
    resetTour,
    endTour,
  };
});
