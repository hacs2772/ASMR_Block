package com.asmrblock.hide;

import java.time.LocalDateTime;

public final class HideDtos {

    private HideDtos() {
    }

    /** 내가 숨긴 크리에이터 한 명 (내 정보 "숨긴 크리에이터"에서 다시 보기) */
    public record HiddenCreatorResponse(Long id, String nickname, LocalDateTime hiddenAt) {
    }
}
