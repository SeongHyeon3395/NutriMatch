import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { COLORS, RADIUS, SPACING } from '../../constants/colors';
import { AppIcon } from '../../components/ui/AppIcon';
import { chatHealth, type HealthChatMessage } from '../../services/api';
import { getMyAvatarSignedUrl } from '../../services/userData';
import { useUserStore } from '../../store/userStore';

type ChatRole = 'user' | 'assistant';

type ChatItem = {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
};

function TypingDots() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d >= 3 ? 1 : d + 1));
    }, 220);
    return () => clearInterval(id);
  }, []);

  return (
    <Text style={styles.thinkingText}>
      {'.'.repeat(dots)}
    </Text>
  );
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ChatScreen() {
  const route = useRoute<any>();
  const listRef = useRef<FlatList<ChatItem> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingAssistantIdRef = useRef<string | null>(null);
  const prefillHandledRef = useRef(false);

  const profile = useUserStore((s) => s.profile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  const [items, setItems] = useState<ChatItem[]>([
    {
      id: makeId(),
      role: 'assistant',
      text: '안녕하세요! 식단/운동/생활습관에 대해 편하게 물어보세요.\n개인 맞춤으로 도와드릴게요.',
    },
  ]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const historyForApi: HealthChatMessage[] = useMemo(() => {
    // Keep it short to control token usage
    const last = items.slice(-12);
    return last.map((m) => ({ role: m.role, text: m.text }));
  }, [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!profile?.avatarPath) {
          if (mounted) setAvatarUrl(null);
          return;
        }
        const url = await getMyAvatarSignedUrl().catch(() => null);
        if (mounted) setAvatarUrl(url);
      } catch {
        if (mounted) setAvatarUrl(null);
      }
    })();

    return () => {
      mounted = false;
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
    };
  }, [profile?.avatarPath]);

  const scrollToEnd = () => {
    // inverted={false} 이므로, 마지막으로 스크롤
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const sendMessage = async (rawMessage: string, clearInput: boolean) => {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (cursorTimerRef.current) {
      clearInterval(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    typingAssistantIdRef.current = null;
    setCursorVisible(true);

    const userItem: ChatItem = { id: makeId(), role: 'user', text: message };
    setItems((prev) => [...prev, userItem]);
    if (clearInput) setText('');
    setIsSending(true);

    const assistantId = makeId();
    setItems((prev) => [...prev, { id: assistantId, role: 'assistant', text: '', pending: true }]);

    try {
      scrollToEnd();

      const userContext = profile
        ? {
            nickname: profile.nickname || profile.username || undefined,
            bodyGoal: (profile as any).bodyGoal,
            healthDiet: (profile as any).healthDiet,
            lifestyleDiet: (profile as any).lifestyleDiet,
            allergens: (profile as any).allergens,
            currentWeight: (profile as any).currentWeight,
            targetWeight: (profile as any).targetWeight,
            height: (profile as any).height,
            age: (profile as any).age,
            gender: (profile as any).gender,
          }
        : null;

      const res = await chatHealth({ message, history: historyForApi, userContext });
      const reply = String(res?.data?.reply || res?.reply || '').trim();
      const finalText = reply || '답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.';

      setItems((prev) => prev.map((m) => (m.id === assistantId ? { ...m, pending: false, text: '' } : m)));

      typingAssistantIdRef.current = assistantId;
      setCursorVisible(true);
      cursorTimerRef.current = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 420);

      const chars = Array.from(finalText);
      let i = 0;
      typingTimerRef.current = setInterval(() => {
        i += 1;
        const slice = chars.slice(0, i).join('');
        setItems((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: slice } : m)));
        scrollToEnd();
        if (i >= chars.length) {
          if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
          }

          typingAssistantIdRef.current = null;
          if (cursorTimerRef.current) {
            clearInterval(cursorTimerRef.current);
            cursorTimerRef.current = null;
          }
          setCursorVisible(false);
        }
      }, 18);
    } catch (e: any) {
      setItems((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                pending: false,
                text: `오류가 발생했어요.\n${String(e?.message || e || 'UNKNOWN_ERROR')}`,
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
      scrollToEnd();
    }
  };

  const handleSend = () => {
    void sendMessage(text, true);
  };

  useEffect(() => {
    const prefillMessage = String(route?.params?.prefillMessage || '').trim();
    const autoSend = Boolean(route?.params?.autoSend);
    if (!prefillMessage || prefillHandledRef.current) return;
    prefillHandledRef.current = true;

    if (autoSend) {
      // Do not leave text in the input; send directly and clear input.
      setText('');
      void sendMessage(prefillMessage, true);
      return;
    }

    setText(prefillMessage);
  }, [route?.params, isSending]);

  const renderItem = ({ item }: { item: ChatItem }) => {
    const isUser = item.role === 'user';
    const isTyping = !item.pending && item.id === typingAssistantIdRef.current;
    const cursor = isTyping && cursorVisible ? '▍' : '';
    return (
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        {!isUser ? (
          <View style={styles.avatarBot}>
            <AppIcon name="smart-toy" size={18} color={COLORS.primary} />
          </View>
        ) : null}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {item.pending ? (
            <TypingDots />
          ) : (
            <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
              {item.text}
              {cursor}
            </Text>
          )}
        </View>

        {isUser ? (
          <View style={styles.avatarUser}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <AppIcon name="person" size={18} color={COLORS.textSecondary} />
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>헬스케어 AI</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={(r) => {
            listRef.current = r;
          }}
          data={items}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="예) 오늘 점심 뭐 먹을까요?"
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isSending || text.trim().length === 0}
              style={[
                styles.sendButton,
                (isSending || text.trim().length === 0) && styles.sendButtonDisabled,
              ]}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppIcon name="send" color="#FFFFFF" size={18} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  header: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantText: {
    color: COLORS.text,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  thinkingText: {
    fontSize: 18,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
  },
  composer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundGray,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
