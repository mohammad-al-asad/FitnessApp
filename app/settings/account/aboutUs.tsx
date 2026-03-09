import PublicCmsHtmlScreen from "@/components/PublicCmsHtmlScreen";
import React from "react";

export const options = {
  tabBarStyle: { display: "none" },
};
const About = () => {
  return (
    <PublicCmsHtmlScreen
      cmsKey="about"
      fallbackTitle="About Us"
      fallbackError="Failed to load about content."
    />
  );
};

export default About;
