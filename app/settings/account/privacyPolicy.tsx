import PublicCmsHtmlScreen from "@/components/PublicCmsHtmlScreen";
import { useLanguage } from "@/hooks/language-context";
import React from "react";

const Privacy = () => {
  const { t } = useLanguage();
  return (
    <PublicCmsHtmlScreen
      cmsKey="privacy"
      fallbackTitle={String(t("privacyPolicy"))}
      fallbackError={String(t("failedToLoadPrivacyPolicy"))}
    />
  );
};

export default Privacy;
