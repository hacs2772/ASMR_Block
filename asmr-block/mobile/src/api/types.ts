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
/**
 * 블록 겉면과 영상 (C안): coverUrl 사진 → 없으면 stickers(최대 3개) + pattern → 둘 다 없으면 트리거 아이콘.
 * hasVideo: 같이 보는 영상이 있는지, videoUrl: 480p·소리 없음 (유료는 내 것일 때만)
 */
export type BlockDesign = {
  coverUrl: string | null;
  stickers: string[];
  pattern: 'dots' | 'lines' | 'none';
  hasVideo: boolean;
  videoUrl: string | null;
};
/** 블록 겉면 스티커 그림 (svg 글자 또는 imageUrl PNG). active=false면 숨긴 스티커: 새로 고를 수는 없지만 이미 붙인 블록에는 그림 */
export type Sticker = {
  code: string;
  name: string;
  svg: string | null;
  imageUrl: string | null;
  active: boolean;
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
/** 베타 손님 계정: 로그인 응답 + 이 기기에 저장해 둘 이메일·비밀번호 */
export type BetaLoginResponse = LoginResponse & { email: string; password: string };

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
  design: BlockDesign | null;
  license: 'CC0' | 'CC_BY' | 'OWN' | 'CREATOR';
  attribution: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category: Category | null;
  tags: Tag[];
  uploader: { id: number; nickname: string };
  playCount: number;
  recentPlays: number | null;
};

/** 크리에이터 페이지 머리 (블록 목록은 catalogApi.blocks({ uploaderId })) */
export type Creator = {
  id: number;
  nickname: string;
  blockCount: number;
  collectorCount: number;
  playCount: number;
  triggers: string[];
  since: string;
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
  design: BlockDesign | null;
};

export type Track = {
  role: LayerRole;
  volume: number;
  duration: number;
  items: TrackItem[];
};

export type RenderStatus = 'NOT_REQUESTED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type Render = { status: RenderStatus; fileUrl: string | null; duration: number | null; progress: number };

/**
 * 조합 담기 정보 (보는 사람 기준).
 * sourceOwner: 남의 조합을 담아 온 복사본이면 원작자. collectedId: 내가 이미 담았으면 내 복사본 id.
 * lockedCount: 내가 아직 갖지 않은 유료 블록 수 (0이어야 한 번에 담기 가능)
 */
export type CollectInfo = {
  sourcePlaylistId: number | null;
  sourceOwner: { id: number; nickname: string } | null;
  collectCount: number;
  collectedId: number | null;
  lockedCount: number;
};

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
  collect: CollectInfo;
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
  collect: CollectInfo;
  createdAt: string;
};

/** 업로드 규칙 (판매 최대 가격 등) */
/** 구간 고르기용으로 먼저 올린 소리 (올리기 때 draftId로) */
export type UploadDraft = { draftId: string; kind: 'audio' | 'video'; duration: number; peaks: number[] };

export type UploadPolicy = {
  maxPrice: number; maxFileMb: number; minSeconds: number; maxSeconds: number; extensions: string[];
  maxVideoMb: number; videoExtensions: string[]; maxImageMb: number; imageExtensions: string[]; stickers: string[]; patterns: string[];
};

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
  /** 관리자가 돌려보낸 이유 (REJECTED일 때만) */
  reviewNote: string | null;
  category: Category | null;
  design: BlockDesign | null;
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
