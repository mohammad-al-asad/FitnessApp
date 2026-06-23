import {
  CustomPurchaseControllerProvider,
  SuperwallProvider,
  type OnPurchaseParams,
} from "expo-superwall";
import React, { type ReactNode } from "react";
import Purchases, {
  PRODUCT_CATEGORY,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";

import { ensureRevenueCatConfigured } from "@/services/revenuecat";

const superwallApiKeys = {
  ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_PUBLIC_API_KEY,
  android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_PUBLIC_API_KEY,
};

const purchaseWithRevenueCat = async (params: OnPurchaseParams) => {
  try {
    await ensureRevenueCatConfigured();

    const products = (
      await Promise.all([
        Purchases.getProducts(
          [params.productId],
          PRODUCT_CATEGORY.SUBSCRIPTION,
        ),
        Purchases.getProducts(
          [params.productId],
          PRODUCT_CATEGORY.NON_SUBSCRIPTION,
        ),
      ])
    ).flat();

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

    return { type: "purchased" as const };
  } catch (error: any) {
    if (
      error?.userCancelled ||
      error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return { type: "cancelled" as const };
    }

    if (error?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return { type: "pending" as const };
    }

    return {
      type: "failed" as const,
      error: error?.message || "The purchase could not be completed.",
    };
  }
};

const purchaseController = {
  onPurchase: purchaseWithRevenueCat,
  onPurchaseRestore: async () => {
    try {
      await ensureRevenueCatConfigured();
      await Purchases.restorePurchases();
      return { type: "restored" as const };
    } catch (error: any) {
      return {
        type: "failed" as const,
        error: error?.message || "Purchases could not be restored.",
      };
    }
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
