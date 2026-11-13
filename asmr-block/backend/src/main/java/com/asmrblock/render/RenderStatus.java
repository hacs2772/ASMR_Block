package com.asmrblock.render;

public enum RenderStatus {
    NOT_REQUESTED, // 아직 요청 안 함 (DB에는 저장되지 않음)
    PENDING,       // 대기 중
    PROCESSING,    // 만드는 중
    DONE,          // 완료 - fileUrl로 재생 가능
    FAILED         // 실패 - 다시 요청하면 재시도
}
