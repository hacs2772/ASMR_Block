/** 백엔드 API 응답 타입 (docs/api_specification.md 와 같은 구조) */

/**
 * 분류. code: 'tap.tapping' 같은 분류 코드, groupCode: 대분류(트리거 묶음) 코드 'tap' — 파형 모양과 트리거 필터에 씀
 */
export type Category = {
  id: number;
  name: string;
  code: string | null;
  groupCode: string | null;
  color: string;
  icon: string | null;
  parentId: number | null;
  parentName: string | null;
};
/** 메뉴 트리: 대분류(트리거 묶음) + 소분류 */
export type CategoryGroup = {
  id: number;
  name: string;
  code: string | null;
  color: string;
  icon: string | null;
  description: string | null;
  children: Category[];
};
/** 말소리: NONE 노토킹 / WHISPER 속삭임 / TALK 말하기 */
export type TalkType = 'NONE' | 'WHISPER' | 'TALK';
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

/**
 * 블록. price = 코인 (0 무료). owned = 내 블록함에 있음.
 * fileUrl은 무료이거나 내 것일 때만 (유료 원본 보호), previewUrl은 무료=전체 / 유료=앞 30초
 */
export type Block = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string | null;
  previewUrl: string | null;
  price: number;
  owned: boolean;
  duration: number;
  talkType: TalkType;
  /** 녹음한 곳 (선택) */
  recordedPlace: string | null;
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
  fileUrl: string | null;
  owned: boolean;
  price: number | null;
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
  /** 얼마나 들을까요? 0 = 한 바퀴만, 그 외 분 */
  listenMinutes: number;
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
  listenMinutes: number;
  owner: { id: number; nickname: string };
  blockCount: number;
  hasMix: boolean;
  previewColors: string[];
  /** 요즘 뜨는 조합에서만: 최근 재생 수 */
  recentPlays: number | null;
  createdAt: string;
};

/** 업로드 규칙 (판매 최대 가격 등) */
export type UploadPolicy = { maxPrice: number; maxFileMb: number; minSeconds: number; maxSeconds: number; extensions: string[] };

/** 판매자: 내가 올린 블록 */
export type MyUpload = {
  id: number;
  title: string;
  fileUrl: string | null;
  duration: number;
  price: number;
  talkType: TalkType;
  recordedPlace: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category: Category | null;
  /** 담은 사람 수 (나 제외) */
  collectedCount: number;
  playCount: number;
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
  listenMinutes: number;
};
