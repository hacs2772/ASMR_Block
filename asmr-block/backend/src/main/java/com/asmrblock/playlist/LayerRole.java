package com.asmrblock.playlist;

/**
 * 타임라인의 트랙 (왼쪽 → 오른쪽으로 흐름).
 * MAIN: 메인 트랙 - 블록을 순서대로 이어서 재생 (대부분의 사람은 이것만 씀)
 * MIX: 믹스 트랙 - 원하는 시간에만 블록을 놓아 메인과 겹쳐 재생 (중간중간 빈칸 가능)
 */
public enum LayerRole {
    MAIN,
    MIX
}
