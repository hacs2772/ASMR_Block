package com.asmrblock.play;

/** 재생 기록 결과. counted=false면 최근에 이미 들어서 재생수에 반영 안 됨 */
public record PlayResult(int playCount, boolean counted) {
}
