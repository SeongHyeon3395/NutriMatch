import { supabase } from './supabaseClient';
import { getSessionUserId } from './userData';
import type {
  CommunityAuthor,
  CommunityCommentsPage,
  CommunityFeedScope,
  CommunityFollowUser,
  CommunityPost,
  CommunityReportReasonType,
  CommunityUserProfile,
  CommunityVisibility,
} from '../types/community';

const COMMUNITY_IMAGES_BUCKET = 'community-images';
const PROFILE_AVATARS_BUCKET = 'profile-avatars';

type CommunityPostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  image_path?: string | null;
  image_url?: string | null;
  visibility?: CommunityVisibility | null;
  comments_enabled?: boolean | null;
  created_at: string;
  updated_at: string;
};

type CommunityPostImageRow = {
  id: string;
  post_id: string;
  image_path?: string | null;
  image_url?: string | null;
  sort_order: number;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type AppUserRowLite = {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_path?: string | null;
};

function requireSupabase() {
  if (!supabase) throw new Error('서버 연결 설정이 없어 요청을 처리할 수 없어요.');
  return supabase;
}

function isLocalDeviceUri(value: unknown): value is string {
  return typeof value === 'string' && /^(file|content):\/\//i.test(value);
}

function toUploadableUri(uri: string) {
  const u = String(uri || '').trim();
  if (!u) return '';
  if (/^(file|content):\/\//i.test(u)) return u;
  return `file://${u}`;
}

function blobFromUri(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response as unknown as Blob);
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    } catch (e: any) {
      reject(e);
    }
  });
}

function ensurePlainBase64(b64: string) {
  const s = String(b64 || '').trim();
  const idx = s.indexOf('base64,');
  const plain = idx >= 0 ? s.slice(idx + 'base64,'.length) : s;
  return plain.replace(/[\r\n\s]/g, '');
}

function base64ToUint8Array(b64: string): Uint8Array {
  const input = ensurePlainBase64(b64);
  if (!input) return new Uint8Array(0);

  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Int16Array(256);
  lookup.fill(-1);
  for (let i = 0; i < alphabet.length; i++) lookup[alphabet.charCodeAt(i)] = i;
  lookup['='.charCodeAt(0)] = 0;

  const len = normalized.length;
  if (len % 4 !== 0) throw new Error('base64 문자열 형식이 올바르지 않습니다.');

  let padding = 0;
  if (len >= 2 && normalized[len - 1] === '=') padding++;
  if (len >= 2 && normalized[len - 2] === '=') padding++;

  const outLen = (len / 4) * 3 - padding;
  const out = new Uint8Array(outLen);

  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = lookup[normalized.charCodeAt(i)];
    const c1 = lookup[normalized.charCodeAt(i + 1)];
    const c2 = lookup[normalized.charCodeAt(i + 2)];
    const c3 = lookup[normalized.charCodeAt(i + 3)];
    if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) throw new Error('base64 문자열에 허용되지 않는 문자가 있습니다.');

    const triple = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (o < outLen) out[o++] = (triple >> 16) & 0xff;
    if (o < outLen) out[o++] = (triple >> 8) & 0xff;
    if (o < outLen) out[o++] = triple & 0xff;
  }

  return out;
}

async function signedUrlFromBucket(bucket: string, path: string, expiresInSeconds = 60 * 60 * 24 * 7) {
  const client = requireSupabase();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

async function tryRemoveFromBucket(bucket: string, path: string) {
  try {
    const client = requireSupabase();
    await client.storage.from(bucket).remove([path]);
  } catch {
    // ignore
  }
}

async function uploadCommunityImage(fileUri: string, userId: string, base64?: string | null) {
  const client = requireSupabase();

  let body: any = null;
  if (typeof base64 === 'string' && base64.trim()) {
    try {
      body = base64ToUint8Array(base64);
    } catch {
      body = null;
    }
  }

  if (!body) {
    const uploadUri = toUploadableUri(fileUri);
    if (!uploadUri) throw new Error('이미지 URI가 비어있습니다.');

    try {
      body = await blobFromUri(uploadUri);
    } catch {
      const resp = await fetch(uploadUri);
      body = await resp.blob();
    }
  }

  const name = `${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
  const path = `${userId}/${name}`;

  const { error } = await client.storage.from(COMMUNITY_IMAGES_BUCKET).upload(path, body as any, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) throw error;
  return path;
}

function toCommunityAuthor(row: AppUserRowLite, avatarUrl?: string | null): CommunityAuthor {
  return {
    id: row.id,
    username: String(row.username || row.nickname || '사용자'),
    nickname: row.nickname,
    avatarUrl: avatarUrl ?? null,
  };
}

async function fetchUsersMap(userIds: string[]) {
  const client = requireSupabase();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return { userMap: new Map<string, AppUserRowLite>(), avatarMap: new Map<string, string | null>() };

  const { data, error } = await client
    .from('app_users')
    .select('id,username,nickname,avatar_path')
    .in('id', ids);
  if (error) throw error;

  const userMap = new Map<string, AppUserRowLite>();
  ((data as AppUserRowLite[] | null) ?? []).forEach((u) => userMap.set(u.id, u));

  const avatarMap = new Map<string, string | null>();
  await Promise.all(
    Array.from(userMap.values()).map(async (u) => {
      const path = String(u.avatar_path || '').trim();
      if (!path) {
        avatarMap.set(u.id, null);
        return;
      }
      try {
        avatarMap.set(u.id, await signedUrlFromBucket(PROFILE_AVATARS_BUCKET, path));
      } catch {
        avatarMap.set(u.id, null);
      }
    })
  );

  return { userMap, avatarMap };
}

async function fetchPostImagesMap(postRows: CommunityPostRow[]) {
  const client = requireSupabase();
  const postIds = postRows.map((p) => p.id);
  const map = new Map<string, string[]>();
  postIds.forEach((id) => map.set(id, []));

  if (postIds.length === 0) return map;

  const { data: imageRows, error: imageError } = await client
    .from('community_post_images')
    .select('id,post_id,image_path,image_url,sort_order')
    .in('post_id', postIds)
    .order('sort_order', { ascending: true });

  if (!imageError) {
    const rows = (imageRows as CommunityPostImageRow[] | null) ?? [];
    for (const row of rows) {
      let url: string | null = null;
      const path = String(row.image_path || '').trim();
      const fallback = String(row.image_url || '').trim();
      if (path) url = await signedUrlFromBucket(COMMUNITY_IMAGES_BUCKET, path).catch(() => null);
      if (!url && fallback) url = fallback;
      if (url) {
        const arr = map.get(row.post_id) ?? [];
        arr.push(url);
        map.set(row.post_id, arr);
      }
    }
  }

  await Promise.all(
    postRows.map(async (post) => {
      const existing = map.get(post.id) ?? [];
      if (existing.length > 0) return;

      let fallbackUrl: string | null = null;
      const path = String(post.image_path || '').trim();
      const imageUrl = String(post.image_url || '').trim();
      if (path) fallbackUrl = await signedUrlFromBucket(COMMUNITY_IMAGES_BUCKET, path).catch(() => null);
      if (!fallbackUrl && imageUrl) fallbackUrl = imageUrl;
      if (fallbackUrl) map.set(post.id, [fallbackUrl]);
    })
  );

  return map;
}

async function buildPosts(
  postRows: CommunityPostRow[],
  me: string,
  followingSet: Set<string>,
  likedSet: Set<string>,
  savedSet: Set<string>,
  reactionCountMap: Map<string, number>,
  commentCountMap: Map<string, number>
): Promise<CommunityPost[]> {
  const userIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean)));
  const { userMap, avatarMap } = await fetchUsersMap(userIds);
  const imagesMap = await fetchPostImagesMap(postRows);

  return postRows.map((p) => {
    const user = userMap.get(p.user_id) || { id: p.user_id, username: '사용자', nickname: null, avatar_path: null };
    return {
      id: p.id,
      author: toCommunityAuthor(user, avatarMap.get(user.id) ?? null),
      caption: String(p.caption || ''),
      imageUrls: imagesMap.get(p.id) ?? [],
      visibility: (p.visibility as CommunityVisibility) || 'public',
      commentsEnabled: p.comments_enabled !== false,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      reactionCount: reactionCountMap.get(p.id) ?? 0,
      commentCount: commentCountMap.get(p.id) ?? 0,
      isLikedByMe: likedSet.has(p.id),
      isSavedByMe: savedSet.has(p.id),
      isFollowingAuthor: p.user_id === me || followingSet.has(p.user_id),
      isMine: p.user_id === me,
    };
  });
}

export async function createCommunityPost(params: {
  caption: string;
  imageUris?: string[];
  visibility?: CommunityVisibility;
}) {
  const client = requireSupabase();
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const caption = String(params.caption || '').trim();
  if (!caption) throw new Error('게시글 내용을 입력해주세요.');

  const visibility: CommunityVisibility =
    params.visibility === 'followers' || params.visibility === 'private' ? params.visibility : 'public';

  const { data: inserted, error: insertError } = await client
    .from('community_posts')
    .insert({ user_id: userId, caption, visibility } as any)
    .select('id')
    .single();

  if (insertError) throw insertError;
  const postId = String((inserted as any)?.id || '');
  if (!postId) throw new Error('게시글 생성에 실패했습니다.');

  const raw = Array.isArray(params.imageUris) ? params.imageUris : [];
  const imageUris = raw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10);
  if (imageUris.length === 0) return postId;

  const uploadedPaths: string[] = [];
  try {
    const rows: Array<{ post_id: string; image_path: string | null; image_url: string | null; sort_order: number }> = [];

    for (let i = 0; i < imageUris.length; i += 1) {
      const uri = imageUris[i];
      if (isLocalDeviceUri(uri)) {
        const path = await uploadCommunityImage(uri, userId, null);
        uploadedPaths.push(path);
        rows.push({ post_id: postId, image_path: path, image_url: null, sort_order: i });
      } else {
        rows.push({ post_id: postId, image_path: null, image_url: uri, sort_order: i });
      }
    }

    const { error: imagesError } = await client.from('community_post_images').insert(rows as any);
    if (imagesError) throw imagesError;
  } catch (e) {
    for (const path of uploadedPaths) {
      await tryRemoveFromBucket(COMMUNITY_IMAGES_BUCKET, path);
    }
    await client.from('community_posts').delete().eq('id', postId).eq('user_id', userId);
    throw e;
  }

  return postId;
}

export async function updateCommunityPost(params: {
  postId: string;
  caption: string;
  imageUris?: string[];
  visibility?: CommunityVisibility;
}) {
  const client = requireSupabase();
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const postId = String(params.postId || '').trim();
  const caption = String(params.caption || '').trim();
  if (!postId) throw new Error('게시글 ID가 비어있습니다.');
  if (!caption) throw new Error('게시글 내용을 입력해주세요.');

  const visibility: CommunityVisibility =
    params.visibility === 'followers' || params.visibility === 'private' ? params.visibility : 'public';

  const { data: oldImages } = await client
    .from('community_post_images')
    .select('image_path')
    .eq('post_id', postId);

  const { error: updateError } = await client
    .from('community_posts')
    .update({ caption, visibility } as any)
    .eq('id', postId)
    .eq('user_id', userId);
  if (updateError) throw updateError;

  const { error: deleteImagesError } = await client
    .from('community_post_images')
    .delete()
    .eq('post_id', postId);
  if (deleteImagesError) throw deleteImagesError;

  const raw = Array.isArray(params.imageUris) ? params.imageUris : [];
  const imageUris = raw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10);

  const uploadedPaths: string[] = [];
  try {
    if (imageUris.length > 0) {
      const rows: Array<{ post_id: string; image_path: string | null; image_url: string | null; sort_order: number }> = [];
      for (let i = 0; i < imageUris.length; i += 1) {
        const uri = imageUris[i];
        if (isLocalDeviceUri(uri)) {
          const path = await uploadCommunityImage(uri, userId, null);
          uploadedPaths.push(path);
          rows.push({ post_id: postId, image_path: path, image_url: null, sort_order: i });
        } else {
          rows.push({ post_id: postId, image_path: null, image_url: uri, sort_order: i });
        }
      }
      const { error: imageInsertError } = await client.from('community_post_images').insert(rows as any);
      if (imageInsertError) throw imageInsertError;
    }

    const oldPaths = ((oldImages as Array<{ image_path?: string | null }> | null) ?? [])
      .map((x) => String(x.image_path || '').trim())
      .filter(Boolean);
    for (const path of oldPaths) {
      await tryRemoveFromBucket(COMMUNITY_IMAGES_BUCKET, path);
    }
  } catch (e) {
    for (const path of uploadedPaths) {
      await tryRemoveFromBucket(COMMUNITY_IMAGES_BUCKET, path);
    }
    throw e;
  }
}

export async function deleteCommunityPost(postId: string) {
  const client = requireSupabase();
  const userId = await getSessionUserId();
  if (!userId) throw new Error('로그인이 필요합니다.');

  const id = String(postId || '').trim();
  if (!id) throw new Error('게시글 ID가 비어있습니다.');

  const [{ data: imageRows }, { data: postRows }] = await Promise.all([
    client.from('community_post_images').select('image_path').eq('post_id', id),
    client.from('community_posts').select('image_path').eq('id', id).eq('user_id', userId).limit(1),
  ]);

  const { error } = await client
    .from('community_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;

  const paths = [
    ...(((imageRows as Array<{ image_path?: string | null }> | null) ?? []).map((x) => String(x.image_path || '').trim())),
    ...(((postRows as Array<{ image_path?: string | null }> | null) ?? []).map((x) => String(x.image_path || '').trim())),
  ].filter(Boolean);

  for (const path of paths) {
    await tryRemoveFromBucket(COMMUNITY_IMAGES_BUCKET, path);
  }
}

export async function listCommunityFeed(params?: {
  limit?: number;
  scope?: CommunityFeedScope;
}): Promise<CommunityPost[]> {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const limit = Math.max(1, Math.min(120, params?.limit ?? 30));
  const scope: CommunityFeedScope = params?.scope === 'following' ? 'following' : 'all';

  const { data: hiddenRows } = await client
    .from('community_hidden_users')
    .select('hidden_user_id')
    .eq('user_id', me);

  const hiddenSet = new Set(
    (((hiddenRows as Array<{ hidden_user_id: string }> | null) ?? []).map((x) => x.hidden_user_id).filter(Boolean))
  );

  const { data: rawPosts, error: postError } = await client
    .from('community_posts')
    .select('id,user_id,caption,image_path,image_url,visibility,comments_enabled,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (postError) throw postError;

  const postRows = (rawPosts as CommunityPostRow[] | null) ?? [];
  if (postRows.length === 0) return [];

  const userIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean)));
  const postIds = postRows.map((p) => p.id);

  const [myReactionsRes, mySavedRes, followsRes, reactionRowsRes, commentRowsRes] = await Promise.all([
    client.from('community_post_reactions').select('post_id').eq('user_id', me).in('post_id', postIds),
    client.from('community_saved_posts').select('post_id').eq('user_id', me).in('post_id', postIds),
    client.from('community_follows').select('followee_user_id').eq('follower_user_id', me).in('followee_user_id', userIds),
    client.from('community_post_reactions').select('post_id').in('post_id', postIds),
    client.from('community_post_comments').select('post_id').in('post_id', postIds),
  ]);

  if (myReactionsRes.error) throw myReactionsRes.error;
  if (mySavedRes.error) throw mySavedRes.error;
  if (followsRes.error) throw followsRes.error;
  if (reactionRowsRes.error) throw reactionRowsRes.error;
  if (commentRowsRes.error) throw commentRowsRes.error;

  const likedSet = new Set((((myReactionsRes.data as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean)));
  const savedSet = new Set((((mySavedRes.data as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean)));
  const followingSet = new Set((((followsRes.data as Array<{ followee_user_id: string }> | null) ?? []).map((x) => x.followee_user_id).filter(Boolean)));

  const reactionCountMap = new Map<string, number>();
  (((reactionRowsRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    reactionCountMap.set(row.post_id, (reactionCountMap.get(row.post_id) ?? 0) + 1);
  });

  const commentCountMap = new Map<string, number>();
  (((commentRowsRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1);
  });

  const visible = postRows.filter((p) => {
    if (hiddenSet.has(p.user_id)) return false;

    const visibility = (p.visibility as CommunityVisibility) || 'public';
    const isMine = p.user_id === me;
    const isFollowing = followingSet.has(p.user_id);

    if (scope === 'following' && !isMine && !isFollowing) return false;

    if (isMine) return true;
    if (visibility === 'public') return true;
    if (visibility === 'followers' && isFollowing) return true;
    return false;
  }).slice(0, limit);

  return buildPosts(visible, me, followingSet, likedSet, savedSet, reactionCountMap, commentCountMap);
}

export async function listCommunityComments(
  postId: string,
  params?: { limit?: number; offset?: number }
): Promise<CommunityCommentsPage> {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, params?.offset ?? 0);

  const { data: postRow, error: postError } = await client
    .from('community_posts')
    .select('id,user_id')
    .eq('id', postId)
    .maybeSingle();
  if (postError) throw postError;
  const postOwnerId = String((postRow as { user_id?: string } | null)?.user_id || '');

  const { data, error } = await client
    .from('community_post_comments')
    .select('id,post_id,user_id,content,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit);

  if (error) throw error;

  const rows = (data as CommunityCommentRow[] | null) ?? [];
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  if (sliced.length === 0) {
    return { comments: [], hasMore: false, nextOffset: offset };
  }

  const userIds = Array.from(new Set(sliced.map((x) => x.user_id).filter(Boolean)));
  const { userMap, avatarMap } = await fetchUsersMap(userIds);

  const comments = sliced.map((row) => {
    const user = userMap.get(row.user_id) || { id: row.user_id, username: '사용자', nickname: null, avatar_path: null };
    return {
      id: row.id,
      postId: row.post_id,
      author: toCommunityAuthor(user, avatarMap.get(user.id) ?? null),
      content: row.content,
      createdAt: row.created_at,
      isMine: row.user_id === me,
      canDeleteByMe: row.user_id === me || postOwnerId === me,
    };
  });

  return {
    comments,
    hasMore,
    nextOffset: offset + comments.length,
  };
}

export async function createCommunityComment(postId: string, content: string) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const trimmed = String(content || '').trim();
  if (!trimmed) throw new Error('댓글 내용을 입력해주세요.');

  const { data: postRow, error: postError } = await client
    .from('community_posts')
    .select('id,comments_enabled')
    .eq('id', postId)
    .maybeSingle();
  if (postError) throw postError;
  if (!postRow) throw new Error('게시물을 찾을 수 없습니다.');
  if ((postRow as { comments_enabled?: boolean | null }).comments_enabled === false) {
    throw new Error('작성자가 댓글을 잠시 닫아두었습니다.');
  }

  const { error } = await client.from('community_post_comments').insert({
    post_id: postId,
    user_id: me,
    content: trimmed,
  } as any);

  if (error) throw error;
}

export async function deleteCommunityComment(commentId: string) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const id = String(commentId || '').trim();
  if (!id) throw new Error('댓글 ID가 비어있습니다.');

  const { error } = await client
    .from('community_post_comments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function setCommunityPostCommentsEnabled(postId: string, enabled: boolean) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const id = String(postId || '').trim();
  if (!id) throw new Error('게시글 ID가 비어있습니다.');

  const { error } = await client
    .from('community_posts')
    .update({ comments_enabled: enabled } as any)
    .eq('id', id)
    .eq('user_id', me);
  if (error) throw error;
}

export async function reportCommunityComment(params: {
  commentId: string;
  reasonType: CommunityReportReasonType;
  reasonDetail?: string;
}) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const reasonType: CommunityReportReasonType = params.reasonType || 'other';
  const reasonDetail = String(params.reasonDetail || '').trim();

  const { error } = await client.from('community_comment_reports').insert({
    comment_id: params.commentId,
    reporter_user_id: me,
    reason_type: reasonType,
    reason_detail: reasonDetail || null,
  } as any);

  if (error) throw error;
}

export async function toggleCommunityPostLike(postId: string, shouldLike: boolean) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  if (shouldLike) {
    const { error } = await client
      .from('community_post_reactions')
      .upsert({ post_id: postId, user_id: me, reaction_type: 'like' } as any, { onConflict: 'post_id,user_id' });
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from('community_post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', me);
  if (error) throw error;
}

export async function toggleCommunityPostSave(postId: string, shouldSave: boolean) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  if (shouldSave) {
    const { error } = await client
      .from('community_saved_posts')
      .upsert({ post_id: postId, user_id: me } as any, { onConflict: 'post_id,user_id' });
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from('community_saved_posts')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', me);
  if (error) throw error;
}

export async function toggleFollowUser(targetUserId: string, shouldFollow: boolean) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');
  if (me === targetUserId) return;

  if (shouldFollow) {
    const { error } = await client
      .from('community_follows')
      .upsert({ follower_user_id: me, followee_user_id: targetUserId } as any, { onConflict: 'follower_user_id,followee_user_id' });
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from('community_follows')
    .delete()
    .eq('follower_user_id', me)
    .eq('followee_user_id', targetUserId);
  if (error) throw error;
}

export async function hideCommunityUserPosts(targetUserId: string, shouldHide: boolean) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');
  if (me === targetUserId) return;

  if (shouldHide) {
    const { error } = await client
      .from('community_hidden_users')
      .upsert({ user_id: me, hidden_user_id: targetUserId } as any, { onConflict: 'user_id,hidden_user_id' });
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from('community_hidden_users')
    .delete()
    .eq('user_id', me)
    .eq('hidden_user_id', targetUserId);
  if (error) throw error;
}

export async function reportCommunityPost(params: {
  postId: string;
  reasonType: CommunityReportReasonType;
  reasonDetail?: string;
}) {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const reasonType: CommunityReportReasonType = params.reasonType || 'other';
  const reasonDetail = String(params.reasonDetail || '').trim();

  const { error } = await client.from('community_post_reports').insert({
    post_id: params.postId,
    reporter_user_id: me,
    reason_type: reasonType,
    reason_detail: reasonDetail || null,
  } as any);

  if (error) throw error;
}

export async function getMyFollowStats() {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const [followersRes, followingRes] = await Promise.all([
    client.from('community_follows').select('*', { count: 'exact', head: true }).eq('followee_user_id', me),
    client.from('community_follows').select('*', { count: 'exact', head: true }).eq('follower_user_id', me),
  ]);

  if (followersRes.error) throw followersRes.error;
  if (followingRes.error) throw followingRes.error;

  return {
    followerCount: typeof followersRes.count === 'number' ? followersRes.count : 0,
    followingCount: typeof followingRes.count === 'number' ? followingRes.count : 0,
  };
}

export async function listCommunityFollowUsers(params: {
  targetUserId: string;
  mode: 'followers' | 'following';
  limit?: number;
}): Promise<CommunityFollowUser[]> {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const targetUserId = String(params.targetUserId || '').trim();
  if (!targetUserId) throw new Error('사용자 ID가 비어있습니다.');

  const limit = Math.max(1, Math.min(300, params.limit ?? 200));
  const mode = params.mode === 'following' ? 'following' : 'followers';

  const { data, error } = mode === 'followers'
    ? await client
      .from('community_follows')
      .select('follower_user_id,created_at')
      .eq('followee_user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit)
    : await client
      .from('community_follows')
      .select('followee_user_id,created_at')
      .eq('follower_user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

  if (error) throw error;

  const ids = ((data as any[] | null) ?? [])
    .map((row) => (mode === 'followers' ? row.follower_user_id : row.followee_user_id))
    .filter(Boolean) as string[];

  if (ids.length === 0) return [];

  const [{ userMap, avatarMap }, myFollowingRes] = await Promise.all([
    fetchUsersMap(ids),
    client.from('community_follows').select('followee_user_id').eq('follower_user_id', me).in('followee_user_id', ids),
  ]);
  if (myFollowingRes.error) throw myFollowingRes.error;

  const myFollowingSet = new Set(
    (((myFollowingRes.data as Array<{ followee_user_id: string }> | null) ?? []).map((x) => x.followee_user_id).filter(Boolean))
  );

  return ids.map((id) => {
    const user = userMap.get(id) || { id, username: '사용자', nickname: null, avatar_path: null };
    return {
      id,
      username: String(user.username || user.nickname || '사용자'),
      nickname: user.nickname,
      avatarUrl: avatarMap.get(id) ?? null,
      isMe: id === me,
      isFollowingByMe: id !== me && myFollowingSet.has(id),
    };
  });
}

export async function getCommunityUserProfile(targetUserId: string): Promise<CommunityUserProfile> {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const userId = String(targetUserId || '').trim();
  if (!userId) throw new Error('사용자 ID가 비어있습니다.');

  const [{ userMap, avatarMap }, followersRes, followingRes, myFollowRes, postsRes, myFollowingRes] = await Promise.all([
    fetchUsersMap([userId]),
    client.from('community_follows').select('*', { count: 'exact', head: true }).eq('followee_user_id', userId),
    client.from('community_follows').select('*', { count: 'exact', head: true }).eq('follower_user_id', userId),
    client
      .from('community_follows')
      .select('followee_user_id')
      .eq('follower_user_id', me)
      .eq('followee_user_id', userId)
      .maybeSingle(),
    client
      .from('community_posts')
      .select('id,user_id,caption,image_path,image_url,visibility,comments_enabled,created_at,updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    client
      .from('community_follows')
      .select('followee_user_id')
      .eq('follower_user_id', me),
  ]);

  if (followersRes.error) throw followersRes.error;
  if (followingRes.error) throw followingRes.error;
  if (myFollowRes.error) throw myFollowRes.error;
  if (postsRes.error) throw postsRes.error;
  if (myFollowingRes.error) throw myFollowingRes.error;

  const followingSet = new Set(
    (((myFollowingRes.data as Array<{ followee_user_id: string }> | null) ?? []).map((x) => x.followee_user_id).filter(Boolean))
  );

  const rawPosts = (postsRes.data as CommunityPostRow[] | null) ?? [];
  const visibleRows = rawPosts.filter((p) => {
    const visibility = (p.visibility as CommunityVisibility) || 'public';
    if (userId === me) return true;
    if (visibility === 'public') return true;
    if (visibility === 'followers' && followingSet.has(userId)) return true;
    return false;
  });

  const postIds = visibleRows.map((p) => p.id);
  const [reactionRes, commentRes, myLikeRes, mySaveRes] = await Promise.all([
    postIds.length > 0
      ? client.from('community_post_reactions').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null } as any),
    postIds.length > 0
      ? client.from('community_post_comments').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null } as any),
    postIds.length > 0
      ? client.from('community_post_reactions').select('post_id').eq('user_id', me).in('post_id', postIds)
      : Promise.resolve({ data: [], error: null } as any),
    postIds.length > 0
      ? client.from('community_saved_posts').select('post_id').eq('user_id', me).in('post_id', postIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (reactionRes.error) throw reactionRes.error;
  if (commentRes.error) throw commentRes.error;
  if (myLikeRes.error) throw myLikeRes.error;
  if (mySaveRes.error) throw mySaveRes.error;

  const reactionCountMap = new Map<string, number>();
  (((reactionRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    reactionCountMap.set(row.post_id, (reactionCountMap.get(row.post_id) ?? 0) + 1);
  });

  const commentCountMap = new Map<string, number>();
  (((commentRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1);
  });

  const likedSet = new Set((((myLikeRes.data as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean)));
  const savedSet = new Set((((mySaveRes.data as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean)));
  const posts = await buildPosts(visibleRows, me, followingSet, likedSet, savedSet, reactionCountMap, commentCountMap);

  const userRow = userMap.get(userId) || { id: userId, username: '사용자', nickname: null, avatar_path: null };
  return {
    user: toCommunityAuthor(userRow, avatarMap.get(userId) ?? null),
    followerCount: typeof followersRes.count === 'number' ? followersRes.count : 0,
    followingCount: typeof followingRes.count === 'number' ? followingRes.count : 0,
    postCount: posts.length,
    isFollowing: Boolean((myFollowRes.data as any)?.followee_user_id),
    posts,
  };
}

export async function listMyLikedCommunityPosts(limit = 120): Promise<CommunityPost[]> {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const { data: myLikes, error: likeError } = await client
    .from('community_post_reactions')
    .select('post_id')
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (likeError) throw likeError;

  const postIds = Array.from(new Set((((myLikes as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean))));
  if (postIds.length === 0) return [];

  const { data: rawPosts, error: postError } = await client
    .from('community_posts')
    .select('id,user_id,caption,image_path,image_url,visibility,comments_enabled,created_at,updated_at')
    .in('id', postIds)
    .order('created_at', { ascending: false });
  if (postError) throw postError;

  const rows = (rawPosts as CommunityPostRow[] | null) ?? [];
  const userIds = Array.from(new Set(rows.map((p) => p.user_id).filter(Boolean)));

  const [followsRes, reactionRowsRes, commentRowsRes, mySavedRes] = await Promise.all([
    client.from('community_follows').select('followee_user_id').eq('follower_user_id', me).in('followee_user_id', userIds),
    client.from('community_post_reactions').select('post_id').in('post_id', postIds),
    client.from('community_post_comments').select('post_id').in('post_id', postIds),
    client.from('community_saved_posts').select('post_id').eq('user_id', me).in('post_id', postIds),
  ]);

  if (followsRes.error) throw followsRes.error;
  if (reactionRowsRes.error) throw reactionRowsRes.error;
  if (commentRowsRes.error) throw commentRowsRes.error;
  if (mySavedRes.error) throw mySavedRes.error;

  const followingSet = new Set((((followsRes.data as Array<{ followee_user_id: string }> | null) ?? []).map((x) => x.followee_user_id).filter(Boolean)));
  const likedSet = new Set(postIds);
  const savedSet = new Set((((mySavedRes.data as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean)));

  const reactionCountMap = new Map<string, number>();
  (((reactionRowsRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    reactionCountMap.set(row.post_id, (reactionCountMap.get(row.post_id) ?? 0) + 1);
  });

  const commentCountMap = new Map<string, number>();
  (((commentRowsRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1);
  });

  return buildPosts(rows, me, followingSet, likedSet, savedSet, reactionCountMap, commentCountMap);
}

export async function listMySavedCommunityPosts(limit = 120): Promise<CommunityPost[]> {
  const client = requireSupabase();
  const me = await getSessionUserId();
  if (!me) throw new Error('로그인이 필요합니다.');

  const { data: mySaves, error: saveError } = await client
    .from('community_saved_posts')
    .select('post_id')
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (saveError) throw saveError;

  const postIds = Array.from(new Set((((mySaves as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean))));
  if (postIds.length === 0) return [];

  const { data: rawPosts, error: postError } = await client
    .from('community_posts')
    .select('id,user_id,caption,image_path,image_url,visibility,comments_enabled,created_at,updated_at')
    .in('id', postIds)
    .order('created_at', { ascending: false });
  if (postError) throw postError;

  const rows = (rawPosts as CommunityPostRow[] | null) ?? [];
  const userIds = Array.from(new Set(rows.map((p) => p.user_id).filter(Boolean)));

  const [followsRes, reactionRowsRes, commentRowsRes, myLikesRes] = await Promise.all([
    client.from('community_follows').select('followee_user_id').eq('follower_user_id', me).in('followee_user_id', userIds),
    client.from('community_post_reactions').select('post_id').in('post_id', postIds),
    client.from('community_post_comments').select('post_id').in('post_id', postIds),
    client.from('community_post_reactions').select('post_id').eq('user_id', me).in('post_id', postIds),
  ]);

  if (followsRes.error) throw followsRes.error;
  if (reactionRowsRes.error) throw reactionRowsRes.error;
  if (commentRowsRes.error) throw commentRowsRes.error;
  if (myLikesRes.error) throw myLikesRes.error;

  const followingSet = new Set((((followsRes.data as Array<{ followee_user_id: string }> | null) ?? []).map((x) => x.followee_user_id).filter(Boolean)));
  const savedSet = new Set(postIds);
  const likedSet = new Set((((myLikesRes.data as Array<{ post_id: string }> | null) ?? []).map((x) => x.post_id).filter(Boolean)));

  const reactionCountMap = new Map<string, number>();
  (((reactionRowsRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    reactionCountMap.set(row.post_id, (reactionCountMap.get(row.post_id) ?? 0) + 1);
  });

  const commentCountMap = new Map<string, number>();
  (((commentRowsRes.data as Array<{ post_id: string }> | null) ?? [])).forEach((row) => {
    commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1);
  });

  return buildPosts(rows, me, followingSet, likedSet, savedSet, reactionCountMap, commentCountMap);
}
