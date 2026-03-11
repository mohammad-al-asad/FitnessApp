import PublicCmsHtmlScreen from "@/components/PublicCmsHtmlScreen";
import { useLanguage } from "@/hooks/language-context";
import React from "react";

const Terms = () => {
  const { t } = useLanguage();
  return (
    <PublicCmsHtmlScreen
      cmsKey="terms"
      fallbackTitle={String(t("termsOfServices"))}
      fallbackError={String(t("failedToLoadTerms"))}
    />
  );
};

export default Terms;
