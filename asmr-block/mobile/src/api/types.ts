/** 백엔드 API 응답 타입 (docs/api_specification.md 와 같은 구조) */

export type Category = { id: number; name: string; color: string; icon: string | null };
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
};

export type Page<T> = {
  content: T[];
  pageInfo: { page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean };
};

export type LayerRole = 'MAIN' | 'BACKGROUND';

export type LayerBlock = {
  position: number;
  blockId: number;
  title: string;
  fileUrl: string;
  duration: number;
  playable: boolean;
  category: Category | null;
};

export type Layer = {
  role: LayerRole;
  volume: number;
  loop: boolean;
  duration: number;
  blocks: LayerBlock[];
};

export type RenderStatus = 'NOT_REQUESTED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type Render = { status: RenderStatus; fileUrl: string | null; duration: number | null };

export type PlaylistDetail = {
  id: number;
  title: string;
  description: string | null;
  isPublic: boolean;
  playCount: number;
  totalDuration: number;
  owner: { id: number; nickname: string };
  main: Layer | null;
  background: Layer | null;
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
  hasBackground: boolean;
  previewColors: string[];
  createdAt: string;
};

export type LayerRequest = { volume: number; loop?: boolean; blockIds: number[] };
export type PlaylistSaveRequest = {
  title: string;
  description?: string | null;
  isPublic: boolean;
  main: LayerRequest;
  background: LayerRequest | null;
};
