import PublicCmsHtmlScreen from "@/components/PublicCmsHtmlScreen";
import { useLanguage } from "@/hooks/language-context";
import React from "react";

export const options = {
  tabBarStyle: { display: "none" },
};
const About = () => {
  const { t } = useLanguage();
  return (
    <PublicCmsHtmlScreen
      cmsKey="about"
      fallbackTitle={String(t("aboutUs"))}
      fallbackError={String(t("failedToLoadAboutContent"))}
    />
  );
};

export default About;
