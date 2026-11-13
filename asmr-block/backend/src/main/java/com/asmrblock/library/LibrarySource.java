package com.asmrblock.library;

/** 블록을 내 블록함에 갖게 된 경로 */
public enum LibrarySource {
    /** 무료 블록을 담음 (뺄 수 있음) */
    FREE,
    /** 코인으로 구매 (구매 기능이 열리면) */
    PURCHASE,
    /** 직접 올린 블록 (승인되면 자동) */
    CREATOR,
    /** 운영자가 지급 (이벤트, 기존 조합 보존 등) */
    GRANT
}
