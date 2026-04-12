import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RADIUS, SPACING } from '../../constants/colors';
import { AppIcon } from '../../components/ui/AppIcon';
import { Button } from '../../components/ui/Button';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStartupStore } from '../../store/appStartupStore';
import { pickPhotoFromLibrary } from '../../services/imagePicker';
import { ensurePhotoLibraryPermissionWithPrompt } from '../../services/permissions';
import {
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  deleteCommunityPost,
  getCommunityUserProfile,
  hideCommunityUserPosts,
  listCommunityFollowUsers,
  listMyLikedCommunityPosts,
  listMySavedCommunityPosts,
  listCommunityComments,
  listCommunityFeed,
  reportCommunityComment,
  reportCommunityPost,
  setCommunityPostCommentsEnabled,
  toggleCommunityPostLike,
  toggleCommunityPostSave,
  toggleFollowUser,
  updateCommunityPost,
} from '../../services/community';
import type {
  CommunityComment,
  CommunityFeedScope,
  CommunityFollowUser,
  CommunityPost,
  CommunityReportReasonType,
  CommunityUserProfile,
  CommunityVisibility,
} from '../../types/community';
import { getSessionUserId } from '../../services/userData';
import { useUserStore } from '../../store/userStore';
import type { FoodLog } from '../../types/user';

type FeedViewMode = 'list' | 'grid';
type ProfileTabMode = 'posts' | 'about' | 'likes' | 'saved';
type ReportOption = { key: CommunityReportReasonType; label: string };
const HASHTAG_BLUE = '#2563EB';
const COMMENT_PAGE_SIZE = 20;
const COMMUNITY_NOTICE_SEEN_KEY = 'community_notice_seen_install_v1';

const REPORT_OPTIONS: ReportOption[] = [
  { key: 'inappropriate', label: '부적절한 내용' },
  { key: 'harassment', label: '비난/혐오/괴롭힘' },
  { key: 'spam', label: '스팸/광고' },
  { key: 'copyright', label: '저작권 침해' },
  { key: 'false_info', label: '허위 정보' },
  { key: 'other', label: '기타' },
];

function timeAgo(iso: string) {
  const now = Date.now();
  const target = Date.parse(String(iso || ''));
  if (!Number.isFinite(target)) return '방금 전';
  const diffSec = Math.max(1, Math.floor((now - target) / 1000));
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  const d = new Date(target);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function initials(label: string) {
  const s = String(label || '').trim();
  if (!s) return 'U';
  return s.slice(0, 1).toUpperCase();
}

function splitTextAndTags(input: string) {
  const text = String(input || '');
  const parts: Array<{ value: string; isTag: boolean }> = [];
  const re = /#[\p{L}\p{N}_]+/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > last) parts.push({ value: text.slice(last, start), isTag: false });
    parts.push({ value: m[0], isTag: true });
    last = end;
  }
  if (last < text.length) parts.push({ value: text.slice(last), isTag: false });
  return parts;
}

function normalizeHashtag(tag: string) {
  const raw = String(tag || '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return withHash.toLowerCase();
}

function extractHashtagsFromText(text: string) {
  const matches = String(text || '').match(/#[\p{L}\p{N}_]+/gu) || [];
  return Array.from(new Set(matches.map((x) => normalizeHashtag(x)).filter(Boolean)));
}

function normalizeTagsInput(input: string) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const tokens = raw
    .split(/[\s,]+/)
    .map((x) => normalizeHashtag(x.replace(/^#+/, '#')))
    .filter(Boolean);
  return Array.from(new Set(tokens)).join(' ');
}

function buildNutritionHeaderFromLog(log: FoodLog) {
  const macros = log.analysis?.macros || {};
  const calories = Number(macros.calories ?? 0);
  const protein = Number(macros.protein_g ?? 0);
  const fat = Number(macros.fat_g ?? 0);
  const carbs = Number(macros.carbs_g ?? 0);
  return [
    '[영양정보]',
    `칼로리: ${Number.isFinite(calories) ? Math.round(calories) : 0} kcal`,
    `단백질: ${Number.isFinite(protein) ? Math.round(protein * 10) / 10 : 0} g`,
    `지방: ${Number.isFinite(fat) ? Math.round(fat * 10) / 10 : 0} g`,
    `탄수화물: ${Number.isFinite(carbs) ? Math.round(carbs * 10) / 10 : 0} g`,
    '',
  ].join('\n');
}

function stripNutritionHeader(text: string) {
  return String(text || '').replace(/^\[영양정보\][\s\S]*?\n\n/, '');
}

export default function CommunityScreen() {
  const { colors, isDark } = useTheme();
  const { alert } = useAppAlert();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const foodLogs = useUserStore((state) => state.foodLogs);
  const loadFoodLogs = useUserStore((state) => state.loadFoodLogs);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedScope, setFeedScope] = useState<CommunityFeedScope>('all');
  const [viewMode, setViewMode] = useState<FeedViewMode>('list');

  const [detailPost, setDetailPost] = useState<CommunityPost | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerZoomed, setImageViewerZoomed] = useState<Record<number, boolean>>({});
  const [imageViewerLastTap, setImageViewerLastTap] = useState<{ ts: number; index: number } | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [composerCaption, setComposerCaption] = useState('');
  const [composerTagsInput, setComposerTagsInput] = useState('');
  const [composerVisibility, setComposerVisibility] = useState<CommunityVisibility>('public');
  const [composerImageUris, setComposerImageUris] = useState<string[]>([]);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [foodImportOpen, setFoodImportOpen] = useState(false);

  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentMenuOpen, setCommentMenuOpen] = useState(false);
  const [commentMenuTarget, setCommentMenuTarget] = useState<CommunityComment | null>(null);
  const [commentReportModalOpen, setCommentReportModalOpen] = useState(false);
  const [commentReportReason, setCommentReportReason] = useState<CommunityReportReasonType>('inappropriate');
  const [commentReportDetail, setCommentReportDetail] = useState('');
  const [isSubmittingCommentReport, setIsSubmittingCommentReport] = useState(false);

  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [postMenuTarget, setPostMenuTarget] = useState<CommunityPost | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<CommunityReportReasonType>('inappropriate');
  const [reportDetail, setReportDetail] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<CommunityUserProfile | null>(null);
  const [profileIsLoading, setProfileIsLoading] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState<FeedViewMode>('grid');
  const [profileTabMode, setProfileTabMode] = useState<ProfileTabMode>('posts');
  const [isTogglingProfileFollow, setIsTogglingProfileFollow] = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following'>('followers');
  const [followUsers, setFollowUsers] = useState<CommunityFollowUser[]>([]);
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);
  const [myLikedPosts, setMyLikedPosts] = useState<CommunityPost[]>([]);
  const [mySavedPosts, setMySavedPosts] = useState<CommunityPost[]>([]);
  const [isLoadingMyCollections, setIsLoadingMyCollections] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [isCheckingNotice, setIsCheckingNotice] = useState(false);
  const [noticeChoice, setNoticeChoice] = useState<'agree' | 'disagree' | null>(null);

  const feedImageSize = useMemo(() => Math.floor(screenWidth / 3) - 1, [screenWidth]);
  const postImageWidth = useMemo(() => screenWidth, [screenWidth]);

  const renderTextWithHashtags = useCallback((text: string, onPressTag?: (tag: string) => void) => {
    const parts = splitTextAndTags(text);
    return parts.map((part, idx) => (
      <Text
        key={`${idx}_${part.value}`}
        style={part.isTag ? styles.hashtagText : undefined}
        onPress={part.isTag ? () => onPressTag?.(part.value) : undefined}
        suppressHighlighting
      >
        {part.value}
      </Text>
    ));
  }, []);

  const filteredFeedPosts = useMemo(() => posts, [posts]);

  const loadFeed = useCallback(async (opts?: { refreshing?: boolean }) => {
    const refreshing = Boolean(opts?.refreshing);
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [me, rows] = await Promise.all([
        getSessionUserId().catch(() => null),
        listCommunityFeed({ limit: 60, scope: feedScope }),
      ]);
      setMyUserId(me);
      setPosts(rows);
    } catch (e: any) {
      alert({ title: '피드 로딩 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      if (refreshing) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [alert, feedScope]);

  const loadComments = useCallback(async (postId: string, opts?: { append?: boolean; offset?: number }) => {
    const append = Boolean(opts?.append);
    const offset = Math.max(0, opts?.offset ?? 0);
    if (append) setIsLoadingMoreComments(true);
    else setIsCommentsLoading(true);
    try {
      const page = await listCommunityComments(postId, { limit: COMMENT_PAGE_SIZE, offset });
      if (append) {
        setComments((prev) => {
          const map = new Map(prev.map((x) => [x.id, x]));
          page.comments.forEach((c) => map.set(c.id, c));
          return Array.from(map.values());
        });
      } else {
        setComments(page.comments);
      }
      setCommentsHasMore(page.hasMore);
      setCommentsOffset(page.nextOffset);
    } catch (e: any) {
      alert({ title: '댓글 로딩 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      if (append) setIsLoadingMoreComments(false);
      else setIsCommentsLoading(false);
    }
  }, [alert]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed])
  );

  useEffect(() => {
    void loadFeed();
  }, [feedScope, loadFeed]);

  useEffect(() => {
    if (!detailPost) return;
    const found = posts.find((x) => x.id === detailPost.id);
    if (found) setDetailPost(found);
  }, [detailPost, posts]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const checkTimeout = setTimeout(() => {
        if (!alive) return;
        setIsCheckingNotice(false);
        setNoticeVisible(false);
      }, 2500);

      void (async () => {
        setIsCheckingNotice(true);
        try {
          const seen = await AsyncStorage.getItem(COMMUNITY_NOTICE_SEEN_KEY);
          if (!alive) return;
          setNoticeVisible(seen !== '1');
          setNoticeChoice(null);
        } catch {
          if (!alive) return;
          setNoticeVisible(true);
          setNoticeChoice(null);
        } finally {
          if (alive) {
            clearTimeout(checkTimeout);
            setIsCheckingNotice(false);
          }
        }
      })();

      return () => {
        alive = false;
        clearTimeout(checkTimeout);
      };
    }, [])
  );

  const closeNoticeToScan = useCallback(() => {
    setIsCheckingNotice(false);
    setNoticeVisible(false);
    setNoticeChoice(null);
    navigation.navigate('Scan' as never);
  }, [navigation]);

  const confirmCommunityNotice = useCallback(() => {
    if (!noticeChoice) {
      alert({ title: '선택 필요', message: '동의 또는 미동의를 먼저 선택해주세요.' });
      return;
    }

    if (noticeChoice === 'agree') {
      setIsCheckingNotice(false);
      setNoticeVisible(false);
      setNoticeChoice(null);
      void AsyncStorage.setItem(COMMUNITY_NOTICE_SEEN_KEY, '1').catch(() => {
        // ignore and proceed
      });
      return;
    }

    setIsCheckingNotice(false);
    setNoticeVisible(false);
    setNoticeChoice(null);
    void AsyncStorage.removeItem(COMMUNITY_NOTICE_SEEN_KEY).catch(() => {
      // ignore
    });
    alert({
      title: '이용 불가',
      message: '미동의 상태에서는 커뮤니티를 이용할 수 없어요.',
      actions: [{ text: '확인', onPress: closeNoticeToScan }],
    });
  }, [alert, closeNoticeToScan, noticeChoice]);

  useEffect(() => {
    const startup = useAppStartupStore.getState();
    if (startup.initialized && startup.foodLogs.length > 0) return;
    void loadFoodLogs();
  }, [loadFoodLogs]);

  const importFromFoodLog = useCallback((log: FoodLog) => {
    const uri = String(log.imageUri || '').trim();
    const header = buildNutritionHeaderFromLog(log);
    setComposerImageUris((prev) => {
      if (!uri) return prev;
      if (prev.includes(uri)) return prev;
      return [...prev, uri].slice(0, 10);
    });
    setComposerCaption((prev) => `${header}${stripNutritionHeader(prev)}`);
    setFoodImportOpen(false);
  }, []);

  useEffect(() => {
    if (!detailPost) return;
    setComments([]);
    setCommentsOffset(0);
    setCommentsHasMore(false);
    void loadComments(detailPost.id, { offset: 0 });
  }, [detailPost, loadComments]);

  const openComposer = useCallback((post?: CommunityPost | null) => {
    if (post) {
      setEditingPost(post);
      setComposerCaption(post.caption);
      setComposerTagsInput(extractHashtagsFromText(post.caption).join(' '));
      setComposerVisibility(post.visibility);
      setComposerImageUris(post.imageUrls.slice(0, 10));
    } else {
      setEditingPost(null);
      setComposerCaption('');
      setComposerTagsInput('');
      setComposerVisibility('public');
      setComposerImageUris([]);
    }
    setComposerOpen(true);
  }, []);

  const pickComposerImage = useCallback(async () => {
    if (composerImageUris.length >= 10) {
      alert({ title: '이미지 제한', message: '게시물당 이미지는 최대 10장까지 업로드할 수 있어요.' });
      return;
    }

    const granted = await ensurePhotoLibraryPermissionWithPrompt({
      confirmRequest: () =>
        new Promise<boolean>((resolve) => {
          alert({
            title: '사진 접근 권한 필요',
            message: '게시글에 사진을 추가하려면 권한 허용이 필요해요.',
            actions: [
              { text: '취소', variant: 'outline', onPress: () => resolve(false) },
              { text: '허용', variant: 'primary', onPress: () => resolve(true) },
            ],
          });
        }),
      onNeverAskAgain: ({ title, message, openSettings }) => {
        alert({
          title,
          message,
          actions: [
            { text: '닫기', variant: 'outline' },
            { text: '설정 열기', variant: 'primary', onPress: () => void openSettings() },
          ],
        });
      },
    });

    if (!granted) return;

    try {
      const picked = await pickPhotoFromLibrary({ quality: 0.84 });
      const uri = String(picked?.uri || '').trim();
      if (!uri) return;
      setComposerImageUris((prev) => [...prev, uri].slice(0, 10));
    } catch (e: any) {
      alert({ title: '이미지 선택 실패', message: e?.message || '이미지를 선택하지 못했어요.' });
    }
  }, [alert, composerImageUris.length]);

  const removeComposerImage = useCallback((index: number) => {
    setComposerImageUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setComposerCoverImage = useCallback((index: number) => {
    setComposerImageUris((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const picked = prev[index];
      return [picked, ...prev.filter((_, i) => i !== index)];
    });
  }, []);

  const submitComposer = useCallback(async () => {
    if (isSavingPost) return;

    const captionBody = String(composerCaption || '').trim();
    const normalizedTags = normalizeTagsInput(composerTagsInput);
    const mergedCaption = [captionBody, normalizedTags].filter(Boolean).join('\n\n').trim();
    if (!mergedCaption) {
      alert({ title: '내용을 입력해주세요', message: '게시글 내용을 먼저 입력해주세요.' });
      return;
    }

    try {
      setIsSavingPost(true);
      if (editingPost) {
        await updateCommunityPost({
          postId: editingPost.id,
          caption: mergedCaption,
          imageUris: composerImageUris,
          visibility: composerVisibility,
        });
      } else {
        await createCommunityPost({
          caption: mergedCaption,
          imageUris: composerImageUris,
          visibility: composerVisibility,
        });
      }

      setComposerOpen(false);
      setEditingPost(null);
      setComposerCaption('');
      setComposerTagsInput('');
      setComposerVisibility('public');
      setComposerImageUris([]);
      await loadFeed({ refreshing: true });
    } catch (e: any) {
      alert({ title: '게시글 저장 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      setIsSavingPost(false);
    }
  }, [alert, composerCaption, composerImageUris, composerTagsInput, composerVisibility, editingPost, isSavingPost, loadFeed]);

  const openComments = useCallback((post: CommunityPost) => {
    setDetailPost(post);
    setComments([]);
    setCommentsOffset(0);
    setCommentsHasMore(false);
    setCommentInput('');
  }, []);

  const openPostDetail = useCallback((post: CommunityPost) => {
    setFollowListOpen(false);
    setProfileModalOpen(false);
    setTimeout(() => setDetailPost(post), 120);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (imageViewerOpen) {
          setImageViewerOpen(false);
          return true;
        }
        if (followListOpen) {
          setFollowListOpen(false);
          return true;
        }
        if (profileModalOpen) {
          setProfileModalOpen(false);
          return true;
        }
        if (foodImportOpen) {
          setFoodImportOpen(false);
          return true;
        }
        if (composerOpen) {
          setComposerOpen(false);
          return true;
        }
        if (detailPost) {
          setDetailPost(null);
          return true;
        }
        if (noticeVisible || isCheckingNotice) {
          closeNoticeToScan();
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [closeNoticeToScan, composerOpen, detailPost, followListOpen, foodImportOpen, imageViewerOpen, isCheckingNotice, noticeVisible, profileModalOpen])
  );

  const sendComment = useCallback(async () => {
    if (!detailPost || isSendingComment) return;
    if (!detailPost.commentsEnabled) {
      alert({ title: '댓글 작성 불가', message: '작성자가 댓글을 잠시 닫아두었습니다.' });
      return;
    }

    const content = String(commentInput || '').trim();
    if (!content) return;

    try {
      setIsSendingComment(true);
      await createCommunityComment(detailPost.id, content);
      setCommentInput('');
      await loadComments(detailPost.id, { offset: 0 });
      await loadFeed({ refreshing: true });
    } catch (e: any) {
      alert({ title: '댓글 등록 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      setIsSendingComment(false);
    }
  }, [alert, commentInput, detailPost, isSendingComment, loadComments, loadFeed]);

  const loadMoreComments = useCallback(async () => {
    if (!detailPost || !commentsHasMore || isLoadingMoreComments || isCommentsLoading) return;
    await loadComments(detailPost.id, { append: true, offset: commentsOffset });
  }, [commentsHasMore, commentsOffset, detailPost, isCommentsLoading, isLoadingMoreComments, loadComments]);

  const toggleLike = useCallback(async (post: CommunityPost) => {
    const nextLike = !post.isLikedByMe;
    setPosts((prev) =>
      prev.map((x) =>
        x.id === post.id
          ? { ...x, isLikedByMe: nextLike, reactionCount: Math.max(0, x.reactionCount + (nextLike ? 1 : -1)) }
          : x
      )
    );

    try {
      await toggleCommunityPostLike(post.id, nextLike);
    } catch {
      setPosts((prev) => prev.map((x) => (x.id === post.id ? post : x)));
    }
  }, []);

  const openPostMenu = useCallback((post: CommunityPost) => {
    setPostMenuTarget(post);
    setPostMenuOpen(true);
  }, []);

  const hideUser = useCallback(async () => {
    const post = postMenuTarget;
    if (!post) return;

    try {
      await hideCommunityUserPosts(post.author.id, true);
      setPostMenuOpen(false);
      setPostMenuTarget(null);
      await loadFeed({ refreshing: true });
    } catch (e: any) {
      alert({ title: '관심없음 처리 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    }
  }, [alert, loadFeed, postMenuTarget]);

  const openReportModal = useCallback(() => {
    setPostMenuOpen(false);
    setReportReason('inappropriate');
    setReportDetail('');
    setReportModalOpen(true);
  }, []);

  const submitReport = useCallback(async () => {
    const post = postMenuTarget;
    if (!post || isSubmittingReport) return;

    try {
      setIsSubmittingReport(true);
      await reportCommunityPost({
        postId: post.id,
        reasonType: reportReason,
        reasonDetail: reportDetail,
      });
      setReportModalOpen(false);
      alert({ title: '신고 완료', message: '신고가 접수되었습니다. 검토 후 조치할게요.' });
    } catch (e: any) {
      alert({ title: '신고 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      setIsSubmittingReport(false);
    }
  }, [alert, isSubmittingReport, postMenuTarget, reportDetail, reportReason]);

  const toggleDetailCommentsEnabled = useCallback(async () => {
    if (!detailPost?.isMine) return;

    const nextEnabled = !detailPost.commentsEnabled;
    try {
      await setCommunityPostCommentsEnabled(detailPost.id, nextEnabled);
      setPosts((prev) => prev.map((x) => (x.id === detailPost.id ? { ...x, commentsEnabled: nextEnabled } : x)));
      setDetailPost((prev) => (prev && prev.id === detailPost.id ? { ...prev, commentsEnabled: nextEnabled } : prev));
    } catch (e: any) {
      alert({ title: '댓글 설정 변경 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    }
  }, [alert, detailPost]);

  const openCommentMenu = useCallback((comment: CommunityComment) => {
    setCommentMenuTarget(comment);
    setCommentMenuOpen(true);
  }, []);

  const deleteCommentFromMenu = useCallback(async () => {
    const target = commentMenuTarget;
    if (!target || !detailPost) return;

    try {
      await deleteCommunityComment(target.id);
      setCommentMenuOpen(false);
      setCommentMenuTarget(null);
      await loadComments(detailPost.id, { offset: 0 });
      await loadFeed({ refreshing: true });
    } catch (e: any) {
      alert({ title: '댓글 삭제 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    }
  }, [alert, commentMenuTarget, detailPost, loadComments, loadFeed]);

  const openCommentReportModal = useCallback(() => {
    setCommentMenuOpen(false);
    setCommentReportReason('inappropriate');
    setCommentReportDetail('');
    setCommentReportModalOpen(true);
  }, []);

  const submitCommentReport = useCallback(async () => {
    const target = commentMenuTarget;
    if (!target || isSubmittingCommentReport) return;

    try {
      setIsSubmittingCommentReport(true);
      await reportCommunityComment({
        commentId: target.id,
        reasonType: commentReportReason,
        reasonDetail: commentReportDetail,
      });
      setCommentReportModalOpen(false);
      setCommentMenuTarget(null);
      alert({ title: '신고 완료', message: '댓글 신고가 접수되었습니다.' });
    } catch (e: any) {
      alert({ title: '신고 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      setIsSubmittingCommentReport(false);
    }
  }, [alert, commentMenuTarget, commentReportDetail, commentReportReason, isSubmittingCommentReport]);

  const deletePostFromMenu = useCallback(async () => {
    const post = postMenuTarget;
    if (!post) return;

    try {
      await deleteCommunityPost(post.id);
      setPostMenuOpen(false);
      setPostMenuTarget(null);
      await loadFeed({ refreshing: true });
    } catch (e: any) {
      alert({ title: '게시물 삭제 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    }
  }, [alert, loadFeed, postMenuTarget]);

  const editPostFromMenu = useCallback(() => {
    const post = postMenuTarget;
    if (!post) return;
    setPostMenuOpen(false);
    openComposer(post);
  }, [openComposer, postMenuTarget]);

  const loadMyCollections = useCallback(async () => {
    if (!myUserId) return;
    setIsLoadingMyCollections(true);
    try {
      const [liked, saved] = await Promise.all([
        listMyLikedCommunityPosts(120),
        listMySavedCommunityPosts(120),
      ]);
      setMyLikedPosts(liked);
      setMySavedPosts(saved);
    } catch {
      setMyLikedPosts([]);
      setMySavedPosts([]);
    } finally {
      setIsLoadingMyCollections(false);
    }
  }, [myUserId]);

  const openUserProfile = useCallback(async (userId: string) => {
    setProfileModalOpen(true);
    setProfileIsLoading(true);
    setProfileData(null);
    setProfileTabMode('posts');
    try {
      const data = await getCommunityUserProfile(userId);
      setProfileData(data);
      const isMine = Boolean(myUserId && userId === myUserId);
      if (isMine) {
        await loadMyCollections();
      } else {
        setMyLikedPosts([]);
        setMySavedPosts([]);
      }
    } catch (e: any) {
      setProfileModalOpen(false);
      alert({ title: '프로필 로딩 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      setProfileIsLoading(false);
    }
  }, [alert, loadMyCollections, myUserId]);

  const openMyProfile = useCallback(() => {
    if (!myUserId) return;
    void openUserProfile(myUserId);
  }, [myUserId, openUserProfile]);

  const openImageViewer = useCallback((images: string[], startIndex = 0) => {
    const safe = Array.isArray(images) ? images.filter(Boolean) : [];
    if (safe.length === 0) return;
    const idx = Math.max(0, Math.min(safe.length - 1, startIndex));
    setImageViewerImages(safe);
    setImageViewerIndex(idx);
    setImageViewerZoomed({});
    setImageViewerLastTap(null);
    setImageViewerOpen(true);
  }, []);

  const onImageViewerTap = useCallback((index: number) => {
    const now = Date.now();
    const prev = imageViewerLastTap;
    const isDoubleTap = Boolean(prev && prev.index === index && now - prev.ts <= 280);
    if (isDoubleTap) {
      setImageViewerZoomed((map) => ({ ...map, [index]: !map[index] }));
      setImageViewerLastTap(null);
      return;
    }
    setImageViewerLastTap({ ts: now, index });
  }, [imageViewerLastTap]);

  const toggleSave = useCallback(async (post: CommunityPost) => {
    const nextSave = !post.isSavedByMe;
    setPosts((prev) => prev.map((x) => (x.id === post.id ? { ...x, isSavedByMe: nextSave } : x)));
    setMyLikedPosts((prev) => prev.map((x) => (x.id === post.id ? { ...x, isSavedByMe: nextSave } : x)));
    setMySavedPosts((prev) => {
      const mapped = prev.map((x) => (x.id === post.id ? { ...x, isSavedByMe: nextSave } : x));
      if (nextSave && !mapped.some((x) => x.id === post.id)) return [{ ...post, isSavedByMe: true }, ...mapped];
      if (!nextSave) return mapped.filter((x) => x.id !== post.id);
      return mapped;
    });

    try {
      await toggleCommunityPostSave(post.id, nextSave);
    } catch {
      setPosts((prev) => prev.map((x) => (x.id === post.id ? post : x)));
      setMyLikedPosts((prev) => prev.map((x) => (x.id === post.id ? post : x)));
      setMySavedPosts((prev) => {
        if (post.isSavedByMe) {
          if (!prev.some((x) => x.id === post.id)) return [{ ...post }, ...prev];
          return prev.map((x) => (x.id === post.id ? post : x));
        }
        return prev.filter((x) => x.id !== post.id);
      });
    }
  }, []);

  const toggleSaveFromMenu = useCallback(async () => {
    const post = postMenuTarget;
    if (!post) return;
    setPostMenuOpen(false);
    await toggleSave(post);
  }, [postMenuTarget, toggleSave]);

  const toggleProfileFollow = useCallback(async () => {
    if (!profileData || isTogglingProfileFollow || !myUserId) return;
    if (profileData.user.id === myUserId) return;

    const nextFollow = !profileData.isFollowing;
    setProfileData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isFollowing: nextFollow,
        followerCount: Math.max(0, prev.followerCount + (nextFollow ? 1 : -1)),
      };
    });

    try {
      setIsTogglingProfileFollow(true);
      await toggleFollowUser(profileData.user.id, nextFollow);
      await loadFeed({ refreshing: true });
    } catch {
      setProfileData((prev) => prev ? { ...prev, isFollowing: !nextFollow, followerCount: Math.max(0, prev.followerCount + (nextFollow ? -1 : 1)) } : prev);
    } finally {
      setIsTogglingProfileFollow(false);
    }
  }, [isTogglingProfileFollow, loadFeed, myUserId, profileData]);

  const openFollowList = useCallback(async (mode: 'followers' | 'following') => {
    if (!profileData) return;
    setFollowListMode(mode);
    setFollowListOpen(true);
    setIsFollowListLoading(true);
    try {
      const users = await listCommunityFollowUsers({
        targetUserId: profileData.user.id,
        mode,
      });
      setFollowUsers(users);
    } catch (e: any) {
      setFollowUsers([]);
      alert({ title: '목록 로딩 실패', message: e?.message || '잠시 후 다시 시도해주세요.' });
    } finally {
      setIsFollowListLoading(false);
    }
  }, [alert, profileData]);

  const openUserFromFollowList = useCallback((userId: string) => {
    setFollowListOpen(false);
    void openUserProfile(userId);
  }, [openUserProfile]);

  const renderPostImages = useCallback((post: CommunityPost) => {
    if (!Array.isArray(post.imageUrls) || post.imageUrls.length === 0) return null;

    return (
      <View style={styles.postImagesWrap}>
        <FlatList
          data={post.imageUrls}
          keyExtractor={(uri, index) => `${post.id}_${index}_${uri}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity activeOpacity={0.95} onPress={() => openImageViewer(post.imageUrls, index)}>
              <Image source={{ uri: item }} style={{ width: postImageWidth, height: postImageWidth }} resizeMode="cover" />
            </TouchableOpacity>
          )}
        />
        {post.imageUrls.length > 1 ? (
          <View style={[styles.multiBadge, { backgroundColor: 'rgba(15,23,42,0.62)' }]}> 
            <AppIcon name="collections" size={14} color="#FFFFFF" />
            <Text style={styles.multiBadgeText}>{post.imageUrls.length}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [openImageViewer, postImageWidth]);

  const renderFeedPost = useCallback(({ item }: { item: CommunityPost }) => {
    const authorName = item.author.nickname || item.author.username || '사용자';

    return (
      <View style={[styles.feedPost, { borderBottomColor: isDark ? colors.textSecondary : colors.textGray, backgroundColor: colors.surface }]}> 
        <View style={styles.feedPostHeader}>
          <TouchableOpacity style={styles.authorRow} activeOpacity={0.8} onPress={() => void openUserProfile(item.author.id)}>
            {item.author.avatarUrl ? (
              <Image source={{ uri: item.author.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: isDark ? colors.surfaceMuted : colors.blue100 }]}> 
                <Text style={[styles.avatarFallbackText, { color: colors.text }]}>{initials(authorName)}</Text>
              </View>
            )}
            <View style={styles.authorMeta}>
              <Text style={[styles.authorName, { color: colors.text }]}>{authorName}</Text>
              <Text style={[styles.authorSubText, { color: colors.textSecondary }]}>{timeAgo(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => openPostMenu(item)}>
            <AppIcon name="more-vert" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {item.caption ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openPostDetail(item)} style={styles.captionWrap}>
            <Text style={[styles.captionText, { color: colors.text }]}>{renderTextWithHashtags(item.caption)}</Text>
          </TouchableOpacity>
        ) : null}

        {item.isMine ? (
          <View style={styles.mineBadgeWrap}>
            <Text style={[styles.mineBadgeText, { color: colors.primary }]}>내 게시물</Text>
          </View>
        ) : null}

        {renderPostImages(item)}

        <View style={styles.statsRow}>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>공감 {item.reactionCount}</Text>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>댓글 {item.commentCount}</Text>
        </View>

        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}> 
          <TouchableOpacity style={styles.actionBtn} onPress={() => void toggleLike(item)}>
            <AppIcon name={item.isLikedByMe ? 'favorite' : 'favorite-border'} size={20} color={item.isLikedByMe ? colors.danger : colors.textSecondary} />
            <Text style={[styles.actionText, { color: item.isLikedByMe ? colors.danger : colors.textSecondary }]}>공감</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => void openComments(item)}>
            <AppIcon name="chat-bubble-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>댓글</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => void toggleSave(item)}>
            <AppIcon name={item.isSavedByMe ? 'bookmark' : 'bookmark-border'} size={20} color={item.isSavedByMe ? colors.primary : colors.textSecondary} />
            <Text style={[styles.actionText, { color: item.isSavedByMe ? colors.primary : colors.textSecondary }]}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, isDark, openComments, openPostDetail, openPostMenu, openUserProfile, renderPostImages, renderTextWithHashtags, toggleLike, toggleSave]);

  const renderGridItem = useCallback(({ item }: { item: CommunityPost }) => {
    const thumb = item.imageUrls[0];
    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: feedImageSize, height: feedImageSize, backgroundColor: colors.surfaceElevated }]}
        onPress={() => openPostDetail(item)}
      >
        {thumb ? <Image source={{ uri: thumb }} style={styles.gridItemImage} resizeMode="cover" /> : <View style={styles.gridNoImage}><AppIcon name="article" size={18} color={colors.textSecondary} /></View>}
        {item.imageUrls.length > 1 ? (
          <View style={styles.gridMultiMark}><AppIcon name="collections" size={13} color="#FFFFFF" /></View>
        ) : null}
      </TouchableOpacity>
    );
  }, [colors.surfaceElevated, colors.textSecondary, feedImageSize, openPostDetail]);

  const profilePosts = profileData?.posts ?? [];
  const isMyProfile = Boolean(profileData && myUserId && profileData.user.id === myUserId);
  useEffect(() => {
    if (!profileModalOpen || !isMyProfile) return;
    if ((profileTabMode === 'likes' && myLikedPosts.length === 0) || (profileTabMode === 'saved' && mySavedPosts.length === 0)) {
      void loadMyCollections();
    }
  }, [isMyProfile, loadMyCollections, myLikedPosts.length, mySavedPosts.length, profileModalOpen, profileTabMode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundGray }]} edges={['top', 'left', 'right']}> 
      <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
        <Text style={[styles.topTitle, { color: colors.text }]}>핏 피드</Text>
        <View style={styles.topRightActions}>
          <TouchableOpacity style={[styles.textChipBtn, { borderColor: colors.border }]} onPress={openMyProfile}>
            <Text style={[styles.textChipBtnText, { color: colors.text }]}>내 페이지</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.textChipBtn, { borderColor: colors.primary }]} onPress={() => openComposer(null)}>
            <Text style={[styles.textChipBtnText, { color: colors.primary }]}>글쓰기</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.controlRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segmentBtn, feedScope === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setFeedScope('all')}
          >
            <Text style={[styles.segmentBtnText, { color: feedScope === 'all' ? '#FFFFFF' : colors.textSecondary }]}>전체보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, feedScope === 'following' && { backgroundColor: colors.primary }]}
            onPress={() => setFeedScope('following')}
          >
            <Text style={[styles.segmentBtnText, { color: feedScope === 'following' ? '#FFFFFF' : colors.textSecondary }]}>팔로우만</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewModeWrap}>
          <TouchableOpacity style={[styles.iconToggleBtn, viewMode === 'list' && { backgroundColor: colors.surfaceElevated }]} onPress={() => setViewMode('list')}>
            <AppIcon name="view-stream" size={18} color={viewMode === 'list' ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconToggleBtn, viewMode === 'grid' && { backgroundColor: colors.surfaceElevated }]} onPress={() => setViewMode('grid')}>
            <AppIcon name="grid-view" size={18} color={viewMode === 'grid' ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : viewMode === 'list' ? (
        <FlatList
          key="feed-list"
          data={filteredFeedPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedPost}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadFeed({ refreshing: true })} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>표시할 게시물이 없어요.</Text></View>}
        />
      ) : (
        <FlatList
          key="feed-grid"
          data={filteredFeedPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderGridItem}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadFeed({ refreshing: true })} tintColor={colors.primary} />}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>표시할 게시물이 없어요.</Text></View>}
        />
      )}

      <Modal visible={composerOpen} animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <SafeAreaView style={[styles.fullModalRoot, { backgroundColor: colors.backgroundGray }]}> 
          <View style={[styles.fullModalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
            <TouchableOpacity onPress={() => setComposerOpen(false)}><AppIcon name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.fullModalTitle, { color: colors.text }]}>{editingPost ? '게시물 수정' : '새 게시물'}</Text>
            <Button title={editingPost ? '수정' : '게시'} onPress={submitComposer} loading={isSavingPost} size="sm" />
          </View>

          <ScrollView contentContainerStyle={styles.composerScrollContent}>
            <TextInput
              multiline
              value={composerCaption}
              onChangeText={setComposerCaption}
              placeholder="내용을 입력하세요"
              placeholderTextColor={colors.textSecondary}
              style={[styles.composerCaptionInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            />

            <TextInput
              value={composerTagsInput}
              onChangeText={setComposerTagsInput}
              placeholder="#태그를 입력하세요 (띄어쓰기 또는 쉼표로 구분)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.composerTagsInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            />

            <View style={styles.composerImagesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>이미지 ({composerImageUris.length}/10)</Text>
              <View style={styles.composerImageButtons}>
                <Button title="불러오기" variant="outline" size="sm" onPress={() => setFoodImportOpen(true)} />
                <Button title="사진 추가" variant="outline" size="sm" onPress={pickComposerImage} />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.composerImageRow}>
              {composerImageUris.map((uri, index) => (
                <View key={`${uri}_${index}`} style={styles.composerImageItem}>
                  <Image source={{ uri }} style={styles.composerImage} resizeMode="cover" />
                  {index === 0 ? (
                    <View style={styles.coverBadgePinned}>
                      <Text style={styles.coverBadgePinnedText}>대표</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.coverBadgeBtn} onPress={() => setComposerCoverImage(index)}>
                      <Text style={styles.coverBadgeBtnText}>대표사진</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.composerImageRemove, { backgroundColor: 'rgba(15,23,42,0.72)' }]} onPress={() => removeComposerImage(index)}>
                    <AppIcon name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10 }]}>공개 범위</Text>
            <View style={styles.visibilityWrap}>
              <TouchableOpacity
                style={[styles.visibilityBtn, { borderColor: colors.border, backgroundColor: composerVisibility === 'public' ? colors.surfaceElevated : colors.surface }]}
                onPress={() => setComposerVisibility('public')}
              >
                <Text style={[styles.visibilityBtnText, { color: colors.text }]}>전체 공유</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityBtn, { borderColor: colors.border, backgroundColor: composerVisibility === 'followers' ? colors.surfaceElevated : colors.surface }]}
                onPress={() => setComposerVisibility('followers')}
              >
                <Text style={[styles.visibilityBtnText, { color: colors.text }]}>팔로우한 사람만</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityBtn, { borderColor: colors.border, backgroundColor: composerVisibility === 'private' ? colors.surfaceElevated : colors.surface }]}
                onPress={() => setComposerVisibility('private')}
              >
                <Text style={[styles.visibilityBtnText, { color: colors.text }]}>나만 보기</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={postMenuOpen} transparent animationType="fade" onRequestClose={() => setPostMenuOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPostMenuOpen(false)}>
          <View style={[styles.menuSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <TouchableOpacity style={styles.menuItem} onPress={() => void toggleSaveFromMenu()}>
              <AppIcon
                name={postMenuTarget?.isSavedByMe ? 'bookmark' : 'bookmark-border'}
                size={18}
                color={postMenuTarget?.isSavedByMe ? colors.primary : colors.text}
              />
              <Text style={[styles.menuItemText, { color: postMenuTarget?.isSavedByMe ? colors.primary : colors.text }]}> 
                {postMenuTarget?.isSavedByMe ? '저장 취소' : '저장'}
              </Text>
            </TouchableOpacity>

            {postMenuTarget?.isMine ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={editPostFromMenu}>
                  <AppIcon name="edit" size={18} color={colors.text} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={deletePostFromMenu}>
                  <AppIcon name="delete" size={18} color={colors.danger} />
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>삭제</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={openReportModal}>
                  <AppIcon name="flag" size={18} color={colors.text} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>신고</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => void hideUser()}>
                  <AppIcon name="visibility-off" size={18} color={colors.text} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>관심없음</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={commentMenuOpen} transparent animationType="fade" onRequestClose={() => setCommentMenuOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCommentMenuOpen(false)}>
          <View style={[styles.menuSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            {commentMenuTarget?.canDeleteByMe ? (
              <TouchableOpacity style={styles.menuItem} onPress={() => void deleteCommentFromMenu()}>
                <AppIcon name="delete" size={18} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>댓글 삭제</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.menuItem} onPress={openCommentReportModal}>
              <AppIcon name="flag" size={18} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>댓글 신고</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={commentReportModalOpen} transparent animationType="slide" onRequestClose={() => setCommentReportModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>댓글 신고</Text>
              <TouchableOpacity onPress={() => setCommentReportModalOpen(false)}><AppIcon name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={styles.reportOptionWrap}>
              {REPORT_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={`comment_${r.key}`}
                  style={[styles.reportOptionBtn, { borderColor: colors.border, backgroundColor: commentReportReason === r.key ? colors.surfaceElevated : colors.surface }]}
                  onPress={() => setCommentReportReason(r.key)}
                >
                  <Text style={[styles.reportOptionText, { color: colors.text }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              multiline
              value={commentReportDetail}
              onChangeText={setCommentReportDetail}
              placeholder="상세 이유를 입력해주세요"
              placeholderTextColor={colors.textSecondary}
              style={[styles.reportDetailInput, { borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.text }]}
            />

            <Button title="신고 접수" onPress={submitCommentReport} loading={isSubmittingCommentReport} />
          </View>
        </View>
      </Modal>

      <Modal visible={reportModalOpen} transparent animationType="slide" onRequestClose={() => setReportModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>게시물 신고</Text>
              <TouchableOpacity onPress={() => setReportModalOpen(false)}><AppIcon name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={styles.reportOptionWrap}>
              {REPORT_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.reportOptionBtn, { borderColor: colors.border, backgroundColor: reportReason === r.key ? colors.surfaceElevated : colors.surface }]}
                  onPress={() => setReportReason(r.key)}
                >
                  <Text style={[styles.reportOptionText, { color: colors.text }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              multiline
              value={reportDetail}
              onChangeText={setReportDetail}
              placeholder="상세 이유를 입력해주세요"
              placeholderTextColor={colors.textSecondary}
              style={[styles.reportDetailInput, { borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.text }]}
            />

            <Button title="신고 접수" onPress={submitReport} loading={isSubmittingReport} />
          </View>
        </View>
      </Modal>

      {detailPost ? (
        <View style={[styles.detailOverlay, { backgroundColor: colors.backgroundGray }]}> 
          <SafeAreaView style={styles.fullModalRoot} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
              style={styles.fullModalRoot}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
            <View style={[styles.fullModalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
              <TouchableOpacity style={styles.headerSideButton} onPress={() => setDetailPost(null)}><AppIcon name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
              <Text style={[styles.fullModalTitle, styles.fullModalTitleCentered, { color: colors.text }]}>게시물 상세</Text>
              <TouchableOpacity style={styles.headerSideButton} onPress={() => openPostMenu(detailPost)}><AppIcon name="more-vert" size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.feedPost, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
                <View style={styles.feedPostHeader}>
                  <TouchableOpacity style={styles.authorRow} activeOpacity={0.8} onPress={() => void openUserProfile(detailPost.author.id)}>
                    {detailPost.author.avatarUrl ? (
                      <Image source={{ uri: detailPost.author.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: isDark ? colors.surfaceMuted : colors.blue100 }]}> 
                        <Text style={[styles.avatarFallbackText, { color: colors.text }]}>{initials(detailPost.author.nickname || detailPost.author.username || '사용자')}</Text>
                      </View>
                    )}
                    <View style={styles.authorMeta}>
                      <Text style={[styles.authorName, { color: colors.text }]}>{detailPost.author.nickname || detailPost.author.username || '사용자'}</Text>
                      <Text style={[styles.authorSubText, { color: colors.textSecondary }]}>{timeAgo(detailPost.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {detailPost.caption ? (
                  <View style={styles.captionWrap}>
                    <Text style={[styles.captionText, { color: colors.text }]}>{renderTextWithHashtags(detailPost.caption)}</Text>
                  </View>
                ) : null}

                {renderPostImages(detailPost)}

                <View style={styles.statsRow}>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>공감 {detailPost.reactionCount}</Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>댓글 {detailPost.commentCount}</Text>
                </View>

                <View style={[styles.actionsRow, { borderTopColor: colors.border }]}> 
                  <TouchableOpacity style={styles.actionBtn} onPress={() => void toggleLike(detailPost)}>
                    <AppIcon name={detailPost.isLikedByMe ? 'favorite' : 'favorite-border'} size={20} color={detailPost.isLikedByMe ? colors.danger : colors.textSecondary} />
                    <Text style={[styles.actionText, { color: detailPost.isLikedByMe ? colors.danger : colors.textSecondary }]}>공감</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => void toggleSave(detailPost)}>
                    <AppIcon name={detailPost.isSavedByMe ? 'bookmark' : 'bookmark-border'} size={20} color={detailPost.isSavedByMe ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.actionText, { color: detailPost.isSavedByMe ? colors.primary : colors.textSecondary }]}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.detailCommentsWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}> 
                <View style={styles.detailCommentsHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>댓글</Text>
                  {detailPost.isMine ? (
                    <TouchableOpacity
                      style={[styles.textChipBtn, { borderColor: colors.border }]}
                      onPress={() => void toggleDetailCommentsEnabled()}
                    >
                      <Text style={[styles.textChipBtnText, { color: colors.text }]}>
                        {detailPost.commentsEnabled ? '댓글 막기' : '댓글 허용'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isCommentsLoading ? (
                  <View style={styles.commentsLoadingWrap}><ActivityIndicator color={colors.primary} /></View>
                ) : comments.length === 0 ? (
                  <View style={styles.emptyCommentWrap}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>아직 댓글이 없습니다.</Text>
                  </View>
                ) : (
                  <View style={styles.commentsListContent}>
                    {comments.map((c) => {
                      const authorName = c.author.nickname || c.author.username || '사용자';
                      return (
                        <View key={c.id} style={[styles.commentRow, { borderBottomColor: colors.border }]}> 
                          <TouchableOpacity onPress={() => void openUserProfile(c.author.id)}>
                            {c.author.avatarUrl ? (
                              <Image source={{ uri: c.author.avatarUrl }} style={styles.commentAvatarImage} />
                            ) : (
                              <View style={[styles.commentAvatarFallback, { backgroundColor: isDark ? colors.surfaceMuted : colors.blue100 }]}>
                                <Text style={[styles.commentAvatarFallbackText, { color: colors.text }]}>{initials(authorName)}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          <View style={styles.commentBody}>
                            <Text style={[styles.commentAuthor, { color: colors.text }]}>{authorName}</Text>
                            <Text style={[styles.commentContent, { color: colors.textSecondary }]}>{renderTextWithHashtags(c.content)}</Text>
                            <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{timeAgo(c.createdAt)}</Text>
                          </View>
                          <TouchableOpacity style={styles.menuButton} onPress={() => openCommentMenu(c)}>
                            <AppIcon name="more-vert" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {commentsHasMore ? (
                  <View style={styles.commentsMoreWrap}>
                    <Button
                      title={isLoadingMoreComments ? '불러오는 중...' : '댓글 더 보기'}
                      variant="outline"
                      size="sm"
                      onPress={loadMoreComments}
                      loading={isLoadingMoreComments}
                      disabled={isLoadingMoreComments}
                    />
                  </View>
                ) : null}

              </View>
            </ScrollView>

            <View
              style={[
                styles.detailComposerDock,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                  bottom: tabBarHeight,
                  paddingBottom: Math.max(insets.bottom, 6),
                },
              ]}
            >
              <View style={styles.commentInputRow}>
                <TextInput
                  value={commentInput}
                  onChangeText={setCommentInput}
                  editable={detailPost.commentsEnabled}
                  placeholder={detailPost.commentsEnabled ? '댓글을 입력하세요' : '작성자가 댓글을 닫았습니다'}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.commentInput, { borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.text }]}
                />
                <Button
                  title="등록"
                  onPress={sendComment}
                  loading={isSendingComment}
                  size="sm"
                  disabled={!detailPost.commentsEnabled}
                  style={styles.commentSubmitBtn}
                />
              </View>
            </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      ) : null}

      <Modal visible={imageViewerOpen} animationType="fade" onRequestClose={() => setImageViewerOpen(false)}>
        <SafeAreaView style={[styles.imageViewerRoot, { backgroundColor: '#000000' }]}> 
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity onPress={() => setImageViewerOpen(false)}>
              <AppIcon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.imageViewerCounter}>{imageViewerIndex + 1} / {imageViewerImages.length}</Text>
          </View>

          <FlatList
            data={imageViewerImages}
            keyExtractor={(item, index) => `viewer_${index}_${item}`}
            horizontal
            pagingEnabled
            initialScrollIndex={imageViewerIndex}
            getItemLayout={(_, index) => ({ length: postImageWidth, offset: postImageWidth * index, index })}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / postImageWidth);
              setImageViewerIndex(Math.max(0, Math.min(imageViewerImages.length - 1, idx)));
            }}
            renderItem={({ item, index }) => (
              <ScrollView
                horizontal
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                contentContainerStyle={{ width: postImageWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}
              >
                <TouchableOpacity activeOpacity={1} onPress={() => onImageViewerTap(index)}>
                  <Image
                    source={{ uri: item }}
                    style={{
                      width: imageViewerZoomed[index] ? postImageWidth * 2 : postImageWidth,
                      height: imageViewerZoomed[index] ? postImageWidth * 2 : postImageWidth,
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </ScrollView>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={profileModalOpen} animationType="slide" onRequestClose={() => setProfileModalOpen(false)}>
        <SafeAreaView style={[styles.fullModalRoot, { backgroundColor: colors.surface }]}> 
          <View style={[styles.fullModalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
            <TouchableOpacity style={styles.headerSideButton} onPress={() => setProfileModalOpen(false)}><AppIcon name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.fullModalTitle, styles.fullModalTitleCentered, { color: colors.text }]}>사용자 페이지</Text>
            <View style={styles.headerSideSpacer} />
          </View>

          {profileIsLoading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : profileData ? (
            <>
              <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
                <View style={styles.profileUserRow}>
                  {profileData.user.avatarUrl ? (
                    <Image source={{ uri: profileData.user.avatarUrl }} style={styles.profileAvatar} />
                  ) : (
                    <View style={[styles.profileAvatarFallback, { backgroundColor: isDark ? colors.surfaceMuted : colors.blue100 }]}>
                      <Text style={[styles.profileAvatarFallbackText, { color: colors.text }]}>
                        {initials(profileData.user.nickname || profileData.user.username)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.profileName, { color: colors.text }]}>{profileData.user.nickname || profileData.user.username}</Text>
                    <View style={styles.profileStatsRow}>
                      <TouchableOpacity onPress={() => void openFollowList('followers')}>
                        <Text style={[styles.profileStatText, styles.profileStatLinkText, { color: colors.textSecondary }]}>팔로워 {profileData.followerCount}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => void openFollowList('following')}>
                        <Text style={[styles.profileStatText, styles.profileStatLinkText, { color: colors.textSecondary }]}>팔로잉 {profileData.followingCount}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.profileStatText, { color: colors.textSecondary }]}>게시물 {profileData.postCount}</Text>
                    </View>
                  </View>
                </View>

                {!isMyProfile ? (
                  <Button
                    title={profileData.isFollowing ? '팔로잉' : '팔로우'}
                    variant={profileData.isFollowing ? 'outline' : 'primary'}
                    onPress={() => void toggleProfileFollow()}
                    loading={isTogglingProfileFollow}
                  />
                ) : null}

                <View style={styles.profileTabWrap}>
                  <TouchableOpacity
                    style={[styles.profileTabBtn, profileTabMode === 'posts' && { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => setProfileTabMode('posts')}
                  >
                    <Text style={[styles.profileTabText, { color: profileTabMode === 'posts' ? colors.text : colors.textSecondary }]}>게시물</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.profileTabBtn, profileTabMode === 'about' && { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => setProfileTabMode('about')}
                  >
                    <Text style={[styles.profileTabText, { color: profileTabMode === 'about' ? colors.text : colors.textSecondary }]}>소개</Text>
                  </TouchableOpacity>
                  {isMyProfile ? (
                    <>
                      <TouchableOpacity
                        style={[styles.profileTabBtn, profileTabMode === 'likes' && { backgroundColor: colors.surfaceElevated }]}
                        onPress={() => setProfileTabMode('likes')}
                      >
                        <Text style={[styles.profileTabText, { color: profileTabMode === 'likes' ? colors.text : colors.textSecondary }]}>좋아요</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.profileTabBtn, profileTabMode === 'saved' && { backgroundColor: colors.surfaceElevated }]}
                        onPress={() => setProfileTabMode('saved')}
                      >
                        <Text style={[styles.profileTabText, { color: profileTabMode === 'saved' ? colors.text : colors.textSecondary }]}>저장</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>

                {profileTabMode === 'posts' || profileTabMode === 'likes' || profileTabMode === 'saved' ? (
                  <View style={styles.profileViewToggleWrap}>
                    <TouchableOpacity style={[styles.iconToggleBtn, profileViewMode === 'list' && { backgroundColor: colors.surfaceElevated }]} onPress={() => setProfileViewMode('list')}>
                      <AppIcon name="view-stream" size={18} color={profileViewMode === 'list' ? colors.text : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconToggleBtn, profileViewMode === 'grid' && { backgroundColor: colors.surfaceElevated }]} onPress={() => setProfileViewMode('grid')}>
                      <AppIcon name="grid-view" size={18} color={profileViewMode === 'grid' ? colors.text : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {profileTabMode === 'posts' ? (profileViewMode === 'list' ? (
                <FlatList
                  key="profile-posts-list"
                  data={profilePosts}
                  keyExtractor={(item) => `profile_${item.id}`}
                  renderItem={renderFeedPost}
                  ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>게시물이 없어요.</Text></View>}
                />
              ) : (
                <FlatList
                  key="profile-posts-grid"
                  data={profilePosts}
                  keyExtractor={(item) => `profile_grid_${item.id}`}
                  numColumns={3}
                  renderItem={renderGridItem}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>게시물이 없어요.</Text></View>}
                />
              )) : profileTabMode === 'likes' ? (isLoadingMyCollections ? (
                <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
              ) : profileViewMode === 'list' ? (
                <FlatList
                  key="profile-likes-list"
                  data={myLikedPosts}
                  keyExtractor={(item) => `liked_${item.id}`}
                  renderItem={renderFeedPost}
                  ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>좋아요한 게시물이 없어요.</Text></View>}
                />
              ) : (
                <FlatList
                  key="profile-likes-grid"
                  data={myLikedPosts}
                  keyExtractor={(item) => `liked_grid_${item.id}`}
                  numColumns={3}
                  renderItem={renderGridItem}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>좋아요한 게시물이 없어요.</Text></View>}
                />
              )) : profileTabMode === 'saved' ? (isLoadingMyCollections ? (
                <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
              ) : profileViewMode === 'list' ? (
                <FlatList
                  key="profile-saved-list"
                  data={mySavedPosts}
                  keyExtractor={(item) => `saved_${item.id}`}
                  renderItem={renderFeedPost}
                  ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>저장한 게시물이 없어요.</Text></View>}
                />
              ) : (
                <FlatList
                  key="profile-saved-grid"
                  data={mySavedPosts}
                  keyExtractor={(item) => `saved_grid_${item.id}`}
                  numColumns={3}
                  renderItem={renderGridItem}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>저장한 게시물이 없어요.</Text></View>}
                />
              )) : profileTabMode === 'about' ? (
                <ScrollView contentContainerStyle={styles.profileAboutWrap}>
                  <View style={[styles.profileAboutCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
                    <Text style={[styles.profileAboutTitle, { color: colors.text }]}>활동 요약</Text>
                    <Text style={[styles.profileAboutText, { color: colors.textSecondary }]}>총 게시물 {profileData.postCount}개</Text>
                    <Text style={[styles.profileAboutText, { color: colors.textSecondary }]}>팔로워 {profileData.followerCount}명</Text>
                    <Text style={[styles.profileAboutText, { color: colors.textSecondary }]}>팔로잉 {profileData.followingCount}명</Text>
                  </View>
                </ScrollView>
              ) : null}
            </>
          ) : null}
        </SafeAreaView>
      </Modal>

      <Modal visible={followListOpen} animationType="slide" onRequestClose={() => setFollowListOpen(false)}>
        <SafeAreaView style={[styles.fullModalRoot, { backgroundColor: colors.surface }]}> 
          <View style={[styles.fullModalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
            <TouchableOpacity onPress={() => setFollowListOpen(false)}><AppIcon name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.fullModalTitle, { color: colors.text }]}>{followListMode === 'followers' ? '팔로워' : '팔로잉'}</Text>
            <View style={{ width: 60 }} />
          </View>

          {isFollowListLoading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : (
            <FlatList
              data={followUsers}
              keyExtractor={(item) => `${followListMode}_${item.id}`}
              renderItem={({ item }) => {
                const label = item.nickname || item.username || '사용자';
                return (
                  <TouchableOpacity
                    style={[styles.followUserRow, { borderBottomColor: colors.border }]}
                    onPress={() => openUserFromFollowList(item.id)}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.followUserAvatar} />
                    ) : (
                      <View style={[styles.followUserAvatarFallback, { backgroundColor: isDark ? colors.surfaceMuted : colors.blue100 }]}>
                        <Text style={[styles.followUserAvatarFallbackText, { color: colors.text }]}>{initials(label)}</Text>
                      </View>
                    )}
                    <View style={styles.followUserBody}>
                      <Text style={[styles.followUserName, { color: colors.text }]}>{label}</Text>
                      <Text style={[styles.followUserSub, { color: colors.textSecondary }]}>@{item.username}</Text>
                    </View>
                    {item.isMe ? (
                      <Text style={[styles.followUserBadgeText, { color: colors.textSecondary }]}>나</Text>
                    ) : item.isFollowingByMe ? (
                      <Text style={[styles.followUserBadgeText, { color: colors.primary }]}>팔로잉</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>아직 목록이 없어요.</Text></View>}
            />
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={foodImportOpen} animationType="slide" onRequestClose={() => setFoodImportOpen(false)}>
        <SafeAreaView style={[styles.fullModalRoot, { backgroundColor: colors.surface }]}> 
          <View style={[styles.fullModalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}> 
            <TouchableOpacity style={styles.headerSideButton} onPress={() => setFoodImportOpen(false)}><AppIcon name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.fullModalTitle, styles.fullModalTitleCentered, { color: colors.text }]}>분석한 음식 불러오기</Text>
            <View style={styles.headerSideSpacer} />
          </View>

          <FlatList
            data={[...foodLogs].sort((a, b) => Date.parse(String(b.timestamp || '')) - Date.parse(String(a.timestamp || '')))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const macros = item.analysis?.macros || {};
              return (
                <TouchableOpacity
                  style={[styles.importFoodRow, { borderBottomColor: colors.border }]}
                  onPress={() => importFromFoodLog(item)}
                >
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.importFoodImage} />
                  ) : (
                    <View style={[styles.importFoodImageFallback, { backgroundColor: colors.surfaceElevated }]}>
                      <AppIcon name="image" size={20} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.importFoodBody}>
                    <Text style={[styles.importFoodTitle, { color: colors.text }]} numberOfLines={1}>{item.analysis?.dishName || '음식'}</Text>
                    <Text style={[styles.importFoodMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      칼로리 {Math.round(Number(macros.calories ?? 0))}kcal · 단백질 {Number(macros.protein_g ?? 0)}g · 지방 {Number(macros.fat_g ?? 0)}g · 탄수 {Number(macros.carbs_g ?? 0)}g
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<View style={styles.emptyWrap}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>불러올 분석 기록이 없습니다.</Text></View>}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={noticeVisible} transparent animationType="fade" onRequestClose={closeNoticeToScan}>
        <View style={styles.noticeBackdrop}>
          <View style={[styles.noticeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.noticeHeaderRow}>
              <Text style={[styles.noticeTitle, { color: colors.text }]}>커뮤니티 이용 안내</Text>
              <TouchableOpacity onPress={closeNoticeToScan} style={styles.noticeCloseBtn}>
                <AppIcon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {isCheckingNotice ? (
              <View style={styles.noticeLoadingWrap}><ActivityIndicator color={colors.primary} /></View>
            ) : (
              <>
                <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>- 타인을 비방하거나 혐오/폭력/성적 모욕이 포함된 게시물은 금지됩니다.</Text>
                <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>- 허위 정보, 스팸/광고, 저작권 침해 콘텐츠는 제재될 수 있습니다.</Text>
                <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>- 신고 누적 시 게시물 제한 또는 계정 이용 제한이 적용될 수 있습니다.</Text>
                <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>- 안전한 커뮤니티 운영을 위해 운영 정책에 동의 후 이용 가능합니다.</Text>

                <TouchableOpacity style={styles.noticeChoiceRow} onPress={() => setNoticeChoice('agree')}>
                  <View style={[styles.noticeCheckCircle, { borderColor: colors.border, backgroundColor: noticeChoice === 'agree' ? colors.primary : colors.surface }]}> 
                    {noticeChoice === 'agree' ? <AppIcon name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={[styles.noticeChoiceText, { color: colors.text }]}>동의</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.noticeChoiceRow} onPress={() => setNoticeChoice('disagree')}>
                  <View style={[styles.noticeCheckCircle, { borderColor: colors.border, backgroundColor: noticeChoice === 'disagree' ? colors.danger : colors.surface }]}> 
                    {noticeChoice === 'disagree' ? <AppIcon name="close" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={[styles.noticeChoiceText, { color: colors.text }]}>미동의</Text>
                </TouchableOpacity>

                <View style={styles.noticeButtonsRow}>
                  <Button title="확인" onPress={confirmCommunityNotice} style={styles.noticeConfirmBtn} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: 22, fontWeight: '800' },
  topRightActions: { flexDirection: 'row', gap: 8 },
  textChipBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  textChipBtnText: { fontSize: 13, fontWeight: '700' },
  controlRow: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full },
  segmentBtnText: { fontSize: 12, fontWeight: '700' },
  viewModeWrap: { flexDirection: 'row', gap: 6 },
  activeTagFilterRow: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeTagFilterText: { fontSize: 13, fontWeight: '700' },
  activeTagFilterClearBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeTagFilterClearText: { fontSize: 12, fontWeight: '700' },
  iconToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '600' },

  feedPost: {
    width: '100%',
    borderBottomWidth: 2,
    paddingTop: 10,
  },
  feedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: 8,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  avatarImage: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 12, fontWeight: '800' },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '800' },
  authorSubText: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  menuButton: { paddingHorizontal: 6, paddingVertical: 4 },
  captionWrap: { paddingHorizontal: SPACING.md, paddingBottom: 8 },
  captionText: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
  mineBadgeWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 8,
  },
  mineBadgeText: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: '#E6F0FF',
  },
  postImagesWrap: { width: '100%', position: 'relative' },
  multiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  multiBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  statsRow: {
    paddingHorizontal: SPACING.md,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  statText: { fontSize: 12, fontWeight: '600' },
  actionsRow: {
    marginTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionText: { fontSize: 13, fontWeight: '700' },

  gridContent: { paddingTop: 1, paddingBottom: 30 },
  gridRow: { gap: 1, marginBottom: 1 },
  gridItem: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gridItemImage: { width: '100%', height: '100%' },
  gridNoImage: { alignItems: 'center', justifyContent: 'center' },
  gridMultiMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15,23,42,0.64)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullModalRoot: { flex: 1 },
  fullModalHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullModalTitle: { fontSize: 16, fontWeight: '800' },
  fullModalTitleCentered: { flex: 1, textAlign: 'center' },
  headerSideButton: {
    width: 44,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideSpacer: { width: 44, height: 34 },

  composerScrollContent: { padding: SPACING.md, paddingBottom: 30 },
  composerCaptionInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    minHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  composerTagsInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    minHeight: 46,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  composerImagesHeader: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerImageButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  composerImageRow: { gap: 10 },
  composerImageItem: { position: 'relative' },
  composerImage: { width: 104, height: 104, borderRadius: RADIUS.md, backgroundColor: '#E2E8F0' },
  coverBadgePinned: {
    position: 'absolute',
    left: 6,
    top: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(37,99,235,0.92)',
  },
  coverBadgePinnedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  coverBadgeBtn: {
    position: 'absolute',
    left: 6,
    top: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  coverBadgeBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  composerImageRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityWrap: { gap: 8, marginTop: 8 },
  visibilityBtn: { borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 12 },
  visibilityBtnText: { fontSize: 14, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.34)',
    justifyContent: 'flex-end',
  },
  commentSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    minHeight: '65%',
    maxHeight: '85%',
    paddingTop: SPACING.md,
  },
  modalHeaderRow: {
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  commentsLoadingWrap: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  commentsList: { maxHeight: 380 },
  commentsListContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  commentsMoreWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  commentAvatarImage: { width: 30, height: 30, borderRadius: 15 },
  commentAvatarFallback: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  commentAvatarFallbackText: { fontSize: 12, fontWeight: '800' },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '800' },
  commentContent: { marginTop: 2, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  commentTime: { marginTop: 2, fontSize: 11, fontWeight: '500' },
  commentInputRow: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 42,
  },
  commentSubmitBtn: {
    borderRadius: RADIUS.sm,
    minHeight: 38,
    minWidth: 64,
    paddingHorizontal: 12,
  },

  menuSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuItemText: { fontSize: 15, fontWeight: '700' },

  reportSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: SPACING.md,
    gap: 10,
  },
  reportOptionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportOptionBtn: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8 },
  reportOptionText: { fontSize: 13, fontWeight: '700' },
  reportDetailInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 14,
  },

  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  detailComposerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 8,
    zIndex: 6,
  },
  detailScroll: { flex: 1 },
  detailScrollContent: {
    flexGrow: 1,
    paddingBottom: 96,
  },
  detailCommentsWrap: {
    flex: 1,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  detailCommentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  emptyCommentWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 12,
  },
  profileUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32 },
  profileAvatarFallback: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  profileAvatarFallbackText: { fontSize: 24, fontWeight: '800' },
  profileName: { fontSize: 18, fontWeight: '800' },
  profileStatsRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  profileStatText: { fontSize: 13, fontWeight: '700' },
  profileStatLinkText: { textDecorationLine: 'underline' },
  profileTabWrap: { flexDirection: 'row', gap: 8 },
  profileTabBtn: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  profileTabText: { fontSize: 12, fontWeight: '700' },
  profileViewToggleWrap: { flexDirection: 'row', gap: 8 },

  profileAboutWrap: { padding: SPACING.md },
  profileAboutCard: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
  },
  profileAboutTitle: { fontSize: 15, fontWeight: '800' },
  profileAboutText: { fontSize: 14, fontWeight: '600' },

  profileTagsWrap: {
    padding: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTagChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileTagText: { fontSize: 13, fontWeight: '700' },
  profileTagCount: { fontSize: 12, fontWeight: '700' },
  hashtagText: { color: HASHTAG_BLUE, fontWeight: '700' },

  followUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  followUserAvatar: { width: 40, height: 40, borderRadius: 20 },
  followUserAvatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  followUserAvatarFallbackText: { fontSize: 14, fontWeight: '800' },
  followUserBody: { flex: 1, minWidth: 0 },
  followUserName: { fontSize: 14, fontWeight: '800' },
  followUserSub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  followUserBadgeText: { fontSize: 12, fontWeight: '700' },

  importFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 10,
  },
  importFoodImage: { width: 62, height: 62, borderRadius: RADIUS.sm },
  importFoodImageFallback: { width: 62, height: 62, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  importFoodBody: { flex: 1, minWidth: 0 },
  importFoodTitle: { fontSize: 14, fontWeight: '800' },
  importFoodMeta: { marginTop: 2, fontSize: 12, fontWeight: '600' },

  imageViewerRoot: { flex: 1 },
  imageViewerHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageViewerCounter: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  noticeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  noticeCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 10,
  },
  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeCloseBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 18, fontWeight: '800' },
  noticeBody: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  noticeChoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  noticeCheckCircle: { width: 22, height: 22, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  noticeChoiceText: { fontSize: 14, fontWeight: '700' },
  noticeButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  noticeConfirmBtn: { flex: 1 },
  noticeLoadingWrap: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
});
