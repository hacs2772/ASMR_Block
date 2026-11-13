package com.asmrblock.block;

/** 블록 검수 상태. 승인(APPROVED)된 블록만 목록에 보이고 플레이리스트에 넣을 수 있음 */
public enum BlockStatus {
    PENDING,
    APPROVED,
    REJECTED
}
