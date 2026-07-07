import {
  CustomPurchaseControllerProvider,
  SuperwallProvider,
  type OnPurchaseParams,
  type PurchaseResult,
  type RestoreResult,
} from "expo-superwall";
import React, { type ReactNode } from "react";
import Purchases, {
  PRODUCT_CATEGORY,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";

import { backendSyncRevenueCat } from "@/services/backend-auth";
import { ensureRevenueCatConfigured } from "@/services/revenuecat";
import {
  emitRevenueCatSyncCompleted,
  emitRevenueCatSyncFailed,
  emitRevenueCatSyncStarted,
} from "@/services/subscription-sync-events";

const superwallApiKeys = {
  ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_PUBLIC_API_KEY,
  android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_PUBLIC_API_KEY,
};

const BACKEND_SYNC_TIMEOUT_MS = 15000;

let purchaseFlowPromise: Promise<PurchaseResult> | null = null;
let restoreFlowPromise: Promise<RestoreResult> | null = null;

const isPurchaseCancelledError = (error: any) => {
  const code = String(error?.code ?? error?.nativeErrorCode ?? "").toLowerCase();
  const underlyingCode = String(
    error?.underlyingErrorCode ?? error?.userInfo?.underlyingErrorCode ?? "",
  ).toLowerCase();
  const message = String(error?.message ?? error?.userInfo?.message ?? "")
    .toLowerCase();

  return (
    error?.userCancelled === true ||
    error?.userCancelled === "true" ||
    error?.cancelled === true ||
    error?.cancelled === "true" ||
    code === String(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR).toLowerCase() ||
    code.includes("purchase_cancel") ||
    code.includes("cancelled") ||
    code.includes("canceled") ||
    underlyingCode.includes("cancel") ||
    message.includes("cancelled") ||
    message.includes("canceled") ||
    message.includes("user canceled") ||
    message.includes("user cancelled")
  );
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const error = new Error(`${label} timed out after ${timeoutMs}ms`);
          console.error(`[Superwall] ${error.message}`);
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const syncRevenueCatSubscriptionState = async (source: string) => {
  emitRevenueCatSyncStarted();
  try {
    console.log(
      `[Superwall] ${source} backend sync request started.`,
    );
    const syncResponse = await withTimeout(
      backendSyncRevenueCat(`superwall:${source}`),
      BACKEND_SYNC_TIMEOUT_MS,
      `${source} backend sync`,
    );
    console.log(
      `[Superwall] ${source} backend sync response: ${JSON.stringify(
        syncResponse,
        null,
        2,
      )}`,
    );
    emitRevenueCatSyncCompleted(syncResponse);
    return syncResponse;
  } catch (syncError) {
    console.error(
      `[Superwall] ${source} backend subscription sync failed:`,
      syncError,
    );
    emitRevenueCatSyncFailed(syncError);
    throw syncError;
  }
};

const syncRevenueCatSubscriptionStateInBackground = (source: string) => {
  void syncRevenueCatSubscriptionState(source).catch(() => undefined);
};

const purchaseWithRevenueCat = async (params: OnPurchaseParams) => {
  if (purchaseFlowPromise) {
    console.log("[Superwall] purchaseWithRevenueCat joined existing purchase flow.");
    return purchaseFlowPromise;
  }

  purchaseFlowPromise = (async () => {
    try {
      console.log(
        `[Superwall] purchaseWithRevenueCat invoked: ${JSON.stringify(params, null, 2)}`,
      );
      await ensureRevenueCatConfigured();

      let products = await Purchases.getProducts(
        [params.productId],
        PRODUCT_CATEGORY.SUBSCRIPTION,
      );

      if (products.length === 0) {
        products = await Purchases.getProducts(
          [params.productId],
          PRODUCT_CATEGORY.NON_SUBSCRIPTION,
        );
      }

      const product =
        (params.platform === "android"
          ? products.find(
              (candidate) =>
                candidate.identifier ===
                `${params.productId}:${params.basePlanId}`,
            )
          : undefined) ??
        products.find((candidate) => candidate.identifier === params.productId) ??
        products[0];

      if (!product) {
        return { type: "failed" as const, error: "Product not found." };
      }

      if (
        params.platform === "android" &&
        product.subscriptionOptions?.length
      ) {
        const optionId = params.offerId
          ? `${params.basePlanId}:${params.offerId}`
          : params.basePlanId;
        const option = product.subscriptionOptions.find(
          (candidate) => candidate.id === optionId,
        );

        if (!option) {
          return {
            type: "failed" as const,
            error: "Subscription option not found.",
          };
        }

        await Purchases.purchaseSubscriptionOption(option);
      } else {
        await Purchases.purchaseStoreProduct(product);
      }

      syncRevenueCatSubscriptionStateInBackground("Purchase-triggered");
      return { type: "purchased" as const };
    } catch (error: any) {
      console.log(
        "[Superwall] RevenueCat purchase error:",
        JSON.stringify({
          code: error?.code,
          nativeErrorCode: error?.nativeErrorCode,
          underlyingErrorCode: error?.underlyingErrorCode,
          message: error?.message,
          userCancelled: error?.userCancelled,
          cancelled: error?.cancelled,
        }),
      );

      if (isPurchaseCancelledError(error)) {
        console.log("[Superwall] RevenueCat purchase cancelled by user.");
        return { type: "cancelled" as const };
      }

      if (error?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        return { type: "pending" as const };
      }

      return {
        type: "failed" as const,
        error: error?.message || "The purchase could not be completed.",
      };
    } finally {
      purchaseFlowPromise = null;
    }
  })();

  return purchaseFlowPromise;
};

const purchaseController = {
  onPurchase: purchaseWithRevenueCat,
  onPurchaseRestore: async () => {
    if (restoreFlowPromise) {
      console.log("[Superwall] onPurchaseRestore joined existing restore flow.");
      return restoreFlowPromise;
    }

    restoreFlowPromise = (async () => {
      try {
        console.log("[Superwall] onPurchaseRestore invoked.");
        await ensureRevenueCatConfigured();
        const customerInfo = await Purchases.restorePurchases();
        const activeEntitlementIds = Object.keys(
          customerInfo?.entitlements?.active ?? {},
        );

        console.log(
          `[Superwall] RevenueCat restore completed. Active entitlements: ${
            activeEntitlementIds.length > 0
              ? activeEntitlementIds.join(", ")
              : "none"
          }`,
        );

        if (activeEntitlementIds.length === 0) {
          return {
            type: "failed" as const,
            error: "No active subscription found.",
          };
        }

        syncRevenueCatSubscriptionStateInBackground("Restore-triggered");
        return { type: "restored" as const };
      } catch (error: any) {
        return {
          type: "failed" as const,
          error: error?.message || "Purchases could not be restored.",
        };
      } finally {
        restoreFlowPromise = null;
      }
    })();

    return restoreFlowPromise;
  },
};

export default function SuperwallRootProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CustomPurchaseControllerProvider controller={purchaseController}>
      <SuperwallProvider
        apiKeys={superwallApiKeys}
        options={{
          passIdentifiersToPlayStore: true,
          paywalls: {
            shouldPreload: true,
            onBackPressed: () => true,
          },
        }}
        onConfigurationError={(error) => {
          console.error("[Superwall] Configuration failed:", error);
        }}
      >
        {children}
      </SuperwallProvider>
    </CustomPurchaseControllerProvider>
  );
}
