import { useSafeColors } from "@/hooks/language-context";
import { backendGetPublicCms } from "@/services/backend-auth";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

type PublicCmsHtmlScreenProps = {
  cmsKey: "about" | "privacy" | "terms";
  fallbackTitle: string;
  fallbackError: string;
};

const buildHtmlDocument = (title: string, content: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #1A1A1A;
      }
      body {
        padding: 16px;
        color: #EAEAEA;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        line-height: 1.7;
      }
      * {
        max-width: 100%;
        box-sizing: border-box;
        color: #EAEAEA !important;
        background: transparent !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #FFFFFF !important;
        margin-top: 0.7em;
      }
      p, li, span, div {
        color: #DADADA !important;
      }
      ul, ol {
        padding-left: 20px;
      }
      a {
        color: #4CAF50 !important;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #3A3A3A;
        padding: 8px;
      }
    </style>
  </head>
  <body>
    ${content || ""}
  </body>
</html>`;

export default function PublicCmsHtmlScreen({
  cmsKey,
  fallbackTitle,
  fallbackError,
}: PublicCmsHtmlScreenProps) {
  const colors = useSafeColors();
  const [title, setTitle] = useState(fallbackTitle);
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const cms = await backendGetPublicCms(cmsKey);
        console.log(cms);

        if (!isMounted) return;
        setTitle(cms.title || fallbackTitle);
        setHtmlContent(cms.content || "");
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || fallbackError);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [cmsKey, fallbackError, fallbackTitle]);

  const documentHtml = useMemo(
    () => buildHtmlDocument(title, htmlContent),
    [htmlContent, title],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.error, { color: colors.text }]}>{error}</Text>
        </View>
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html: documentHtml, baseUrl: "https://fitco.app/" }}
          style={styles.webview}
          containerStyle={styles.webview}
          showsVerticalScrollIndicator={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          onError={() => setError(fallbackError)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  error: {
    textAlign: "center",
  },
  webview: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
});
