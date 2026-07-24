import type { VerifyIapResponse } from "@/services/backend-auth";

type RevenueCatSyncEvent =
  | { type: "started" }
  | { type: "completed"; response: VerifyIapResponse }
  | { type: "failed"; error: unknown };

type RevenueCatSyncListener = (event: RevenueCatSyncEvent) => void;

const listeners = new Set<RevenueCatSyncListener>();

const emit = (event: RevenueCatSyncEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error(
        "[Auth] RevenueCat sync listener failed to handle event:",
        error,
      );
    }
  });
};

export const emitRevenueCatSyncStarted = () => {
  emit({ type: "started" });
};

export const emitRevenueCatSyncCompleted = (response: VerifyIapResponse) => {
  emit({ type: "completed", response });
};

export const emitRevenueCatSyncFailed = (error: unknown) => {
  emit({ type: "failed", error });
};

export const subscribeToRevenueCatSync = (
  listener: RevenueCatSyncListener,
) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
