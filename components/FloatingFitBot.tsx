// FloatingFitBot — draggable floating chat button and full-screen modal for the Fitco AI assistant; handles user messages, typing animation, and offline demo replies.

import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import { Send, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FoodLogModal from './FoodLogModal';

type Message = {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  isTyping?: boolean;
  displayText?: string;
};

interface FloatingFitBotProps {
  bottom?: number;
  right?: number;
}

export default function FloatingFitBot({ bottom = 100, right = 20 }: FloatingFitBotProps) {
  const [showModal, setShowModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text:
        "👋 Hi! I'm FitBot, your AI fitness assistant! I can help with nutrition advice, workout tips, and meal planning. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Floating drag position (starts near bottom-right)
  const pan = useRef(
    new Animated.ValueXY({
      x: screenWidth - right - 56,
      y: screenHeight - bottom - 56 - (Platform.OS === 'ios' ? insets.bottom : 0),
    })
  ).current;
  const [isDragging, setIsDragging] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  // Typing animation: find the first bot message that isTyping === true and animate its text
  useEffect(() => {
    const typingMsg = messages.find((m) => m.isTyping && !m.isUser);
    if (!typingMsg || typingMessageId === typingMsg.id) return;

    // clear any existing timer
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
            : m
        )
      );
      i += 1;

      if (i < full.length) {
        typingTimeoutRef.current = setTimeout(tick, speed);
      } else {
        // done typing
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingMsg.id ? { ...m, isTyping: false, displayText: full } : m
          )
        );
        setTypingMessageId(null);
        scrollToBottom();
      }
    };

    typingTimeoutRef.current = setTimeout(tick, speed);
  }, [messages, typingMessageId, scrollToBottom]);

  // Auto-scroll on new finished messages or user messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.isUser || !last.isTyping) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup timers
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
  Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: false }),
  Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
]).start(() => setIsVisible(true));
  };

  // Drag behavior
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        const buttonSize = 56;
        const minX = 0;
        const maxX = screenWidth - buttonSize;
        const minY = insets.top;
        const maxY = screenHeight - buttonSize - (Platform.OS === 'ios' ? insets.bottom : 0);

        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        const x = Math.max(minX, Math.min(maxX, currentX));
        const y = Math.max(minY, Math.min(maxY, currentY));

        if (x !== currentX || y !== currentY) {
          Animated.spring(pan, { toValue: { x, y }, useNativeDriver: false }).start();
        }

        setTimeout(() => setIsDragging(false), 100);
      },
    })
  ).current;

  const handleClose = () => setIsVisible(false);

  // OFFLINE reply generator
  const queueOfflineReply = () => {
    const canned =
      "🤖 (Offline demo) I'm not connected to the AI right now, but your chat UI is working great! Try asking about protein targets, a simple meal plan, or a push/pull/legs split.";
    const botTyping: Message = {
      id: String(Date.now() + 1),
      text: canned,
      isUser: false,
      timestamp: new Date(),
      isTyping: true,
      displayText: '',
    };
    setMessages((prev) => [...prev, botTyping]);
  };

  const sendMessage = () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    (async () => {
  try {
    console.log("🚀 Sending message to OpenRouter...");

   const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer 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",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "mistralai/mistral-nemo:free", // ✅ Working free model
    messages: [
     {
  role: "system",
  content:
    "You are **FitBot**, the official AI assistant of the Fitco app — a Saudi-built bilingual fitness and nutrition tracker. \
Always speak as part of Fitco. Never recommend or mention other apps, websites, or brands (like MyFitnessPal, Calorie.ai, etc.). \
When users ask about tracking, logging, macros, or fitness, always refer to Fitco's features directly. \
Keep replies short, friendly, and helpful — one to three sentences max. You can use emojis sometimes but stay professional.",
},

      {
        role: "user",
        content: inputText,
      },
    ],
  }),
});


    const data = await res.json();
    console.log("💬 OpenRouter Response:", data);

    const botReply =
      data?.choices?.[0]?.message?.content ||
      "🤖 Sorry, I couldn’t generate a response. Try again!";

    const botMsg: Message = {
      id: String(Date.now() + 1),
      text: botReply,
      isUser: false,
      timestamp: new Date(),
      isTyping: true,
      displayText: "",
    };

    setMessages((prev) => [...prev, botMsg]);
  } catch (err) {
    console.error("HF ERROR:", err);
    const fallback: Message = {
      id: String(Date.now() + 1),
      text:
        "⚠️ There was an error reaching the FitBot AI. Please check your connection or try again later.",
      isUser: false,
      timestamp: new Date(),
      isTyping: true,
      displayText: "",
    };
    setMessages((prev) => [...prev, fallback]);
  } finally {
    setIsLoading(false);
  }
})();
  };

  return (
    <>
      {/* Floating Button */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingButton,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity style={styles.buttonTouchable} onPress={() => setIsVisible(true)} activeOpacity={0.85}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/l39tt3mt1q74w8l7x2p95' }}
            style={styles.cuteIcon}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Fullscreen Chat Modal */}
      <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
        <LinearGradient
          colors={['#0f0f23', '#1a1a3e', '#2d1b69', '#1e3a8a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.botIcon}>
                  <Image
                    source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/l39tt3mt1q74w8l7x2p95' }}
                    style={styles.cuteIconHeader}
                  />
                </View>
                <Text style={styles.headerTitle}>FitBot</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <KeyboardAvoidingView
            style={styles.contentContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((m) => (
                <View key={m.id} style={[styles.messageContainer, m.isUser ? styles.userMessage : styles.botMessage]}>
                  {!m.isUser && (
                    <View style={styles.botAvatar}>
                      <Image
                        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/l39tt3mt1q74w8l7x2p95' }}
                        style={styles.cuteIconAvatar}
                      />
                    </View>
                  )}
                  <View style={[styles.messageBubble, m.isUser ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageText, m.isUser ? styles.userText : styles.botText]}>
                      {m.isTyping && !m.isUser ? m.displayText ?? '' : m.text}
                      {m.isTyping && !m.isUser ? <Text style={styles.cursor}>|</Text> : null}
                    </Text>
                  </View>
                </View>
              ))}

              {isLoading && (
                <View style={[styles.messageContainer, styles.botMessage]}>
                  <View style={styles.botAvatar}>
                    <Image
                      source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/l39tt3mt1q74w8l7x2p95' }}
                      style={styles.cuteIconAvatar}
                    />
                  </View>
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <ActivityIndicator size="small" color="#00d4ff" />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
              <View className="inputWrapper" style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask me anything about fitness..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                  maxLength={500}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Send size={20} color={(!inputText.trim() || isLoading) ? 'rgba(255,255,255,0.6)' : 'white'} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
       </Modal>

      {/* 🥗 Food Log Modal */}
      <FoodLogModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onLogFood={() => {
          setShowModal(false);
          router.push('../log');
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
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  botIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: 'white' },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  contentContainer: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  userMessage: { justifyContent: 'flex-end' },
  botMessage: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2,
  },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: {
    backgroundColor: '#00d4ff',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: 'white' },
  botText: { color: 'white' },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: { flex: 1, fontSize: 16, color: 'white', maxHeight: 100, paddingVertical: 8 },
  sendButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#00d4ff',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.3)' },
  cursor: { color: '#00d4ff', fontWeight: 'bold' },
  cuteIcon: { width: 52, height: 52, borderRadius: 24 },
  cuteIconHeader: { width: 30, height: 30, borderRadius: 14 },
  cuteIconAvatar: { width: 26, height: 26, borderRadius: 12 },
});
