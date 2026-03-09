import PublicCmsHtmlScreen from "@/components/PublicCmsHtmlScreen";
import React from "react";

const Terms = () => {
  return (
    <PublicCmsHtmlScreen
      cmsKey="terms"
      fallbackTitle="Terms Of Services"
      fallbackError="Failed to load terms."
    />
  );
};

export default Terms;
