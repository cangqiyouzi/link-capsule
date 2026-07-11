export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export type HealthStatus = "ok" | "dead" | "redirect" | "slow" | "rate_limited" | "unknown";

export interface HealthInfo {
  status: HealthStatus;
  httpCode: number | null;
  finalUrl: string | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
}

export interface Capsule {
  id: number;
  userId: string | null;
  title: string;
  url: string;
  description: string | null;
  color: string;
  pinned: boolean;
  visibility: "private" | "unlisted" | "public";
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Tag[];
  health: HealthInfo | null;
}

// 发现页 / 时间线 / 用户主页 的胶囊卡片（带作者信息，无 tags）
export interface SocialCapsule {
  id: number;
  title: string;
  url: string;
  description: string | null;
  color: string;
  createdAt: Date;
  userId: string | null;
  userName: string;
  userImage: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  image: string | null;
  createdAt: Date;
  capsules: SocialCapsule[];
  isFollowing: boolean;
  followersCount: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  coverColor: string | null;
  visibility: "private" | "unlisted" | "public";
  createdAt: Date;
  updatedAt: Date;
  count?: number;
}

export interface CollectionItem {
  capsuleId: number;
  sortOrder: number;
  addedAt: Date;
  id: number;
  title: string;
  url: string;
  description: string | null;
  color: string;
  pinned: boolean;
  createdAt: Date;
  tags: Tag[];
}

