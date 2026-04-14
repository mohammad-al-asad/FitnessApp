export type SubscriptionPlan = {
  planType: string;
  interval: string;
  label: string;
  price: number;
  priceCents: number;
  currency: string;
  apple_sku?: string;
  google_sku?: string;
};

export const STATIC_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    planType: "monthly",
    interval: "month",
    label: "Monthly Plan",
    apple_sku: "com.fitco.subscription.monthly",
    google_sku: "com-fitco-subscription-monthly",
    price: 7.99,
    currency: "USD",
    priceCents: 799,
  },
  {
    planType: "yearly",
    interval: "year",
    label: "Yearly Plan",
    apple_sku: "com.fitco.subscription.yearly",
    google_sku: "com-fitco-subscription-yearly",
    price: 39.99,
    currency: "USD",
    priceCents: 3999,
  },
];
