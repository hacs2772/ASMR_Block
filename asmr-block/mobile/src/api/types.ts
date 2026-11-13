/** 백엔드 API 응답 타입 (docs/api_specification.md 와 같은 구조) */

export type Category = { id: number; name: string; color: string; icon: string | null; parentId: number | null; parentName: string | null };
/** 메뉴 트리: 대분류 + 소분류 */
export type CategoryGroup = { id: number; name: string; color: string; icon: string | null; description: string | null; children: Category[] };
export type Tag = { id: number; name: string };

export type User = {
  id: number;
  email: string;
  nickname: string;
  profileImage: string | null;
  language: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
};

export type LoginResponse = { accessToken: string; refreshToken: string; user: User };

export type Block = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  duration: number;
  license: 'CC0' | 'CC_BY' | 'OWN' | 'CREATOR';
  attribution: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category: Category | null;
  tags: Tag[];
  uploader: { id: number; nickname: string };
  playCount: number;
  recentPlays: number | null;
};

export type Page<T> = {
  content: T[];
  pageInfo: { page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean };
};

export type LayerRole = 'MAIN' | 'MIX';

/** 트랙에 놓인 블록. duration = 1번 길이, totalDuration = duration x repeat */
export type TrackItem = {
  position: number;
  blockId: number;
  title: string;
  fileUrl: string;
  duration: number;
  repeat: number;
  startSeconds: number | null;
  totalDuration: number;
  playable: boolean;
  category: Category | null;
};

export type Track = {
  role: LayerRole;
  volume: number;
  duration: number;
  items: TrackItem[];
};

export type RenderStatus = 'NOT_REQUESTED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type Render = { status: RenderStatus; fileUrl: string | null; duration: number | null; progress: number };

export type PlaylistDetail = {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  playCount: number;
  totalDuration: number;
  owner: { id: number; nickname: string };
  main: Track | null;
  mix: Track | null;
  render: Render;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistSummary = {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  playCount: number;
  totalDuration: number;
  owner: { id: number; nickname: string };
  blockCount: number;
  hasMix: boolean;
  previewColors: string[];
  createdAt: string;
};

export type ItemRequest = { blockId: number; repeat: number; startSeconds?: number };
export type TrackRequest = { volume: number; items: ItemRequest[] };
export type PlaylistSaveRequest = {
  title: string;
  description?: string | null;
  isPublic: boolean;
  main: TrackRequest;
  mix: TrackRequest | null;
};
