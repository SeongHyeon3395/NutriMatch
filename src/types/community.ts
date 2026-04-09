export type CommunityReactionType = 'like';
export type CommunityVisibility = 'public' | 'followers' | 'private';
export type CommunityFeedScope = 'all' | 'following';

export type CommunityAuthor = {
  id: string;
  username: string;
  nickname?: string | null;
  avatarUrl?: string | null;
};

export type CommunityFollowUser = CommunityAuthor & {
  isMe: boolean;
  isFollowingByMe: boolean;
};

export type CommunityPost = {
  id: string;
  author: CommunityAuthor;
  caption: string;
  imageUrls: string[];
  visibility: CommunityVisibility;
  commentsEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
  reactionCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
  isFollowingAuthor: boolean;
  isMine: boolean;
};

export type CommunityComment = {
  id: string;
  postId: string;
  author: CommunityAuthor;
  content: string;
  createdAt: string;
  isMine: boolean;
  canDeleteByMe: boolean;
};

export type CommunityCommentsPage = {
  comments: CommunityComment[];
  hasMore: boolean;
  nextOffset: number;
};

export type CommunityUserProfile = {
  user: CommunityAuthor;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  posts: CommunityPost[];
};

export type CommunityReportReasonType =
  | 'inappropriate'
  | 'harassment'
  | 'spam'
  | 'copyright'
  | 'false_info'
  | 'other';
