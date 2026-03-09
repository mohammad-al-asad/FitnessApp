import PublicCmsHtmlScreen from "@/components/PublicCmsHtmlScreen";
import React from "react";

const Privacy = () => {
  return (
    <PublicCmsHtmlScreen
      cmsKey="privacy"
      fallbackTitle="Privacy Policy"
      fallbackError="Failed to load privacy policy."
    />
  );
};

export default Privacy;
