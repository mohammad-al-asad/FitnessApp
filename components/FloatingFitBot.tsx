import FirstSignInSubscriptionModal from "@/components/FirstSignInSubscriptionModal";
import { useLanguage } from "@/hooks/language-context";
import {
  backendGetChatHistory,
  backendGetChatLimitStatus,
  backendSendChatMessage,
  type ChatLimitStatus,
} from "@/services/backend-auth";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Send, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FoodLogModal from "./FoodLogModal";

type Message = {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  isTyping?: boolean;
  displayText?: string;
};

const WELCOME_ID = "welcome";

const formatMathText = (input: string): string => {
  if (!input) return input;

  let text = input;

  // Convert common LaTeX math delimiters to plain content.
  text = text.replace(/\\\[/g, "\n").replace(/\\\]/g, "\n");
  text = text.replace(/\\\(/g, "").replace(/\\\)/g, "");

  // Convert common LaTeX commands.
  text = text.replace(/\\text\{([^}]*)\}/g, "$1");
  text = text.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  text = text.replace(/\\cdot/g, "*");
  text = text.replace(/\\times/g, "x");
  text = text.replace(/\\approx/g, "~");
  text = text.replace(/\\pm/g, "+/-");
  text = text.replace(/\\%/g, "%");

  // Convert fractions; run multiple passes to handle repeated fractions.
  let previous = "";
  while (previous !== text) {
    previous = text;
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  }

  // Convert grouped super/sub scripts into a readable inline form.
  text = text.replace(/\^\{([^{}]+)\}/g, "^$1");
  text = text.replace(/_\{([^{}]+)\}/g, "_$1");

  // Remove escape slashes left before braces.
  text = text.replace(/\\([{}])/g, "$1");

  return text.replace(/\n{3,}/g, "\n\n").trim();
};

interface FloatingFitBotProps {
  bottom?: number;
  right?: number;
}

export default function FloatingFitBot({
  bottom = 100,
  right = 20,
}: FloatingFitBotProps) {
  const BUTTON_SIZE = 56;
  const [showModal, setShowModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLimit, setIsLoadingLimit] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [chatLimit, setChatLimit] = useState<ChatLimitStatus | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [androidKeyboardOffset, setAndroidKeyboardOffset] = useState(0);
  const { isRTL, t } = useLanguage();

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  // 📝 Update welcome message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === WELCOME_ID) {
      setMessages([
        {
          id: WELCOME_ID,
          text: String(t("fitBotWelcome")),
          isUser: false,
          timestamp: messages[0].timestamp,
        },
      ]);
    } else if (messages.length === 0 && !hasLoadedHistory) {
      setMessages([
        {
          id: WELCOME_ID,
          text: String(t("fitBotWelcome")),
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [t, hasLoadedHistory]);

  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const initialX = isRTL ? -right : screenWidth - right - BUTTON_SIZE;
  const initialY =
    screenHeight -
    bottom -
    BUTTON_SIZE -
    (Platform.OS === "ios" ? insets.bottom : 0);

  const pan = useRef(
    new Animated.ValueXY({
      x: initialX,
      y: initialY,
    }),
  ).current;
  const [isDragging, setIsDragging] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const loadChatLimit = useCallback(async () => {
    try {
      setIsLoadingLimit(true);
      const limit = await backendGetChatLimitStatus();
      setChatLimit(limit);
    } catch {
      setChatLimit(null);
    } finally {
      setIsLoadingLimit(false);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    void loadChatLimit();
  }, [isVisible, loadChatLimit]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setAndroidKeyboardOffset(event.endCoordinates.height);
      scrollToBottom();
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  const isChatLimitReached =
    !!chatLimit && !chatLimit.isUnlimited && chatLimit.messagesLeftToday <= 0;
  const prevChatLimitReachedRef = useRef(false);

  const chatLimitUsagePercent =
    chatLimit && !chatLimit.isUnlimited && chatLimit.dailyFreeLimit > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (chatLimit.messagesUsedToday / chatLimit.dailyFreeLimit) * 100,
          ),
        )
      : 0;

  useEffect(() => {
    if (isVisible && isChatLimitReached && !prevChatLimitReachedRef.current) {
      setShowSubscriptionModal(true);
    }
    prevChatLimitReachedRef.current = isChatLimitReached;
  }, [isChatLimitReached, isVisible]);

  useEffect(() => {
    const typingMsg = messages.find((m) => m.isTyping && !m.isUser);
    if (!typingMsg || typingMessageId === typingMsg.id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setTypingMessageId(typingMsg.id);

    const full = typingMsg.text;
    let i = 0;
    const speed = 15;

    const tick = () => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === typingMsg.id
            ? { ...m, displayText: full.slice(0, i + 1) }
            : m,
        ),
      );
      i += 1;

      if (i < full.length) {
        typingTimeoutRef.current = setTimeout(tick, speed);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingMsg.id
              ? { ...m, isTyping: false, displayText: full }
              : m,
          ),
        );
        setTypingMessageId(null);
        scrollToBottom();
      }
    };

    typingTimeoutRef.current = setTimeout(tick, speed);
  }, [messages, typingMessageId, scrollToBottom]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.isUser || !last.isTyping) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  const handlePress = () => {
    if (isDragging) return;

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start(() => setIsVisible(true));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        const minX = isRTL ? -(screenWidth - BUTTON_SIZE) : 0;
        const maxX = isRTL ? 0 : screenWidth - BUTTON_SIZE;
        const minY = insets.top;
        const maxY =
          screenHeight -
          BUTTON_SIZE -
          (Platform.OS === "ios" ? insets.bottom : 0);

        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        const x = Math.max(minX, Math.min(maxX, currentX));
        const y = Math.max(minY, Math.min(maxY, currentY));

        if (x !== currentX || y !== currentY) {
          Animated.spring(pan, {
            toValue: { x, y },
            useNativeDriver: false,
          }).start();
        }

        setTimeout(() => setIsDragging(false), 100);
      },
    }),
  ).current;

  useEffect(() => {
    pan.setValue({ x: initialX, y: initialY });
  }, [initialX, initialY, pan]);

  const handleClose = () => setIsVisible(false);

  useEffect(() => {
    if (!isVisible || hasLoadedHistory) return;

    const loadHistory = async () => {
      try {
        const history = await backendGetChatHistory();
        if (!history.length) {
          setHasLoadedHistory(true);
          return;
        }

        const sortedHistory = [...history].sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });

        const mapped: Message[] = [];
        sortedHistory.forEach((item, idx) => {
          const ts = item.createdAt ? new Date(item.createdAt) : new Date();
          mapped.push({
            id: `h-user-${item._id || idx}`,
            text: item.prompt,
            isUser: true,
            timestamp: ts,
          });
          mapped.push({
            id: `h-bot-${item._id || idx}`,
            text: formatMathText(item.response),
            isUser: false,
            timestamp: ts,
          });
        });

        setMessages(mapped);
      } catch {
        // Keep welcome message when history cannot be loaded.
      } finally {
        setHasLoadedHistory(true);
      }
    };

    loadHistory();
  }, [isVisible, hasLoadedHistory]);

  const sendMessage = () => {
    if (!inputText.trim() || isLoading || isLoadingLimit || isChatLimitReached)
      return;
    const prompt = inputText.trim();

    const userMsg: Message = {
      id: String(Date.now()),
      text: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    (async () => {
      try {
        const botReply = await backendSendChatMessage(prompt);

        const botMsg: Message = {
          id: String(Date.now() + 1),
          text: formatMathText(
            botReply || "Sorry, I couldn't generate a response. Try again.",
          ),
          isUser: false,
          timestamp: new Date(),
          isTyping: true,
          displayText: "",
        };

        setMessages((prev) => [...prev, botMsg]);
      } catch (error: any) {
        const raw = String(error?.message ?? "").toLowerCase();
        const isLimitError = raw.includes("limit");
        if (isLimitError) {
          setShowSubscriptionModal(true);
        }
        const fallback: Message = {
          id: String(Date.now() + 1),
          text: isLimitError
            ? String(t("chatLimitReachedNotice"))
            : "There was an error reaching FitBot. Please check your connection and try again.",
          isUser: false,
          timestamp: new Date(),
          isTyping: true,
          displayText: "",
        };
        setMessages((prev) => [...prev, fallback]);
      } finally {
        setIsLoading(false);
        void loadChatLimit();
      }
    })();
  };

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingButton,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Image
            source={require("@/assets/images/fitbot.png")}
            style={styles.cuteIcon}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <LinearGradient
          colors={["#0f0f23", "#1a1a3e", "#2d1b69", "#1e3a8a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.botIcon}>
                  <Image
                    source={require("@/assets/images/fitbot.png")}
                    style={styles.cuteIconHeader}
                  />
                </View>
                <Text style={styles.headerTitle}>FitBot</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.limitContainer}>
            {isLoadingLimit ? (
              <ActivityIndicator size="small" color="#22c55e" />
            ) : chatLimit ? (
              <>
                <View style={styles.limitRow}>
                  <Text style={styles.limitTitle}>
                    {chatLimit.isUnlimited
                      ? String(t("chatUnlimitedLabel"))
                      : `${String(t("chatDailyLimitLabel"))}: ${chatLimit.messagesUsedToday}/${chatLimit.dailyFreeLimit}`}
                  </Text>
                  {!chatLimit.isUnlimited && (
                    <Text
                      style={[
                        styles.limitCount,
                        isChatLimitReached && styles.limitCountReached,
                      ]}
                    >
                      {chatLimit.messagesLeftToday}{" "}
                      {String(t("chatMessagesLeftToday"))}
                    </Text>
                  )}
                </View>

                {!chatLimit.isUnlimited && (
                  <View style={styles.limitTrack}>
                    <View
                      style={[
                        styles.limitFill,
                        {
                          width: `${chatLimitUsagePercent}%`,
                          backgroundColor: isChatLimitReached
                            ? "#f97316"
                            : "#22c55e",
                        },
                      ]}
                    />
                  </View>
                )}

                {isChatLimitReached && (
                  <Text style={styles.limitNotice}>
                    {String(t("chatLimitReachedNotice"))}
                  </Text>
                )}
              </>
            ) : null}
          </View>

          <KeyboardAvoidingView
            style={styles.contentContainer}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            enabled={Platform.OS === "ios"}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.messageContainer,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                    m.isUser ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  {!m.isUser && (
                    <View style={styles.botAvatar}>
                      <Image
                        source={require("@/assets/images/fitbot.png")}
                        style={styles.cuteIconAvatar}
                      />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      m.isUser ? styles.userBubble : styles.botBubble,
                      isRTL
                        ? m.isUser
                          ? {
                              borderBottomLeftRadius: 4,
                              borderBottomRightRadius: 20,
                            }
                          : {
                              borderBottomLeftRadius: 20,
                              borderBottomRightRadius: 4,
                              marginRight: 6,
                            }
                        : {},
                    ]}
                  >
                    {m.isUser || m.isTyping ? (
                      <Text
                        style={[
                          styles.messageText,
                          m.isUser ? styles.userText : styles.botText,
                        ]}
                      >
                        {m.isTyping && !m.isUser
                          ? (m.displayText ?? "")
                          : m.text}
                        {m.isTyping && !m.isUser ? (
                          <Text style={styles.cursor}>|</Text>
                        ) : null}
                      </Text>
                    ) : (
                      <Markdown style={markdownStyles}>{m.text}</Markdown>
                    )}
                  </View>
                </View>
              ))}

              {isLoading && (
                <View
                  style={[
                    styles.messageContainer,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                    styles.botMessage,
                  ]}
                >
                  <View style={styles.botAvatar}>
                    <Image
                      source={require("@/assets/images/fitbot.png")}
                      style={styles.cuteIconAvatar}
                    />
                  </View>
                  <View
                    style={[
                      styles.messageBubble,
                      styles.botBubble,
                      isRTL && {
                        borderBottomLeftRadius: 20,
                        borderBottomRightRadius: 4,
                        marginRight: 6,
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color="#00d4ff" />
                  </View>
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.inputContainer,
                Platform.OS === "android" && {
                  marginBottom: androidKeyboardOffset,
                },
              ]}
            >
              <View className="inputWrapper" style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.textInput,
                    { textAlign: isRTL ? "right" : "left" },
                  ]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={
                    isChatLimitReached
                      ? String(t("chatLimitReachedInput"))
                      : String(t("chatInputPlaceholder"))
                  }
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                  maxLength={500}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  editable={!isChatLimitReached}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() ||
                      isLoading ||
                      isLoadingLimit ||
                      isChatLimitReached) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={
                    !inputText.trim() ||
                    isLoading ||
                    isLoadingLimit ||
                    isChatLimitReached
                  }
                >
                  <Send
                    size={20}
                    color={
                      !inputText.trim() || isLoading
                        ? "rgba(255,255,255,0.6)"
                        : "white"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.persistentDisclaimer}>
              <Text style={styles.disclaimerText}>
                {String(t("fitBotDisclaimer"))}
              </Text>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      <FoodLogModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onLogFood={() => {
          setShowModal(false);
          router.push("../log");
        }}
        onCreateCustom={() => {
          setShowModal(false);
          router.push("/modal/createCustomFood");
        }}
        onScanBarcode={() => {
          setShowModal(false);
          router.push("/(modals)/scanBarcode" as any);
        }}
      />
      <FirstSignInSubscriptionModal
        visible={showSubscriptionModal}
        onDismiss={() => setShowSubscriptionModal(false)}
        onSubscribe={() => {
          setShowSubscriptionModal(false);
          router.push("/settings/subscription" as any);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22c55e",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
    overflow: "hidden",
  },
  buttonTouchable: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  limitContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
    gap: 6,
  },
  limitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  limitTitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "600",
  },
  limitCount: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "600",
  },
  limitCountReached: {
    color: "#fdba74",
  },
  limitTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  limitFill: {
    height: "100%",
    borderRadius: 999,
  },
  persistentDisclaimer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.15)", // Semi-transparent white backdrop
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  disclaimerText: {
    color: "#fde047", // Yellowish color
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  limitNotice: {
    color: "#fdba74",
    fontSize: 12,
    lineHeight: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  botIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "white" },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userMessage: { justifyContent: "flex-end" },
  botMessage: { justifyContent: "flex-start" },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#00d4ff",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: "white" },
  botText: { color: "white" },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "white",
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00d4ff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: "rgba(255,255,255,0.3)" },
  cursor: { color: "#00d4ff", fontWeight: "bold" },
  cuteIcon: { width: 52, height: 52, borderRadius: 24 },
  cuteIconHeader: { width: 30, height: 30, borderRadius: 14 },
  cuteIconAvatar: { width: 26, height: 26, borderRadius: 12 },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: "white",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 0,
  },
  paragraph: {
    color: "white",
    marginTop: 0,
    marginBottom: 8,
  },
  heading1: {
    color: "white",
    fontSize: 22,
    marginTop: 0,
    marginBottom: 8,
  },
  heading2: {
    color: "white",
    fontSize: 20,
    marginTop: 0,
    marginBottom: 8,
  },
  heading3: {
    color: "white",
    fontSize: 18,
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    color: "white",
    fontWeight: "700",
  },
  em: {
    color: "white",
    fontStyle: "italic",
  },
  bullet_list: {
    marginTop: 0,
    marginBottom: 8,
  },
  ordered_list: {
    marginTop: 0,
    marginBottom: 8,
  },
  list_item: {
    color: "white",
    marginTop: 0,
    marginBottom: 4,
  },
  code_inline: {
    color: "#c7f9ff",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    color: "#c7f9ff",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 8,
    borderRadius: 8,
  },
});
