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
    google_sku: "fitco-subscription-monthly",
    price: 0,
    currency: "",
    priceCents: 0,
  },
  {
    planType: "yearly",
    interval: "year",
    label: "Yearly Plan",
    apple_sku: "com.fitco.subscription.yearly",
    google_sku: "fitco-subscription-yearly",
    price: 0,
    currency: "",
    priceCents: 0,
  },
];
