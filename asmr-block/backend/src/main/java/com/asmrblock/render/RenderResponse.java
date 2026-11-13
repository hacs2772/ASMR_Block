package com.asmrblock.render;

import com.asmrblock.storage.StorageService;

/**
 * 완성본 상태. status가 DONE이면 fileUrl을 재생하면 됨 (끊김 없는 하나의 파일).
 * progress: 만드는 중 진행률(0~100). 긴 조합(몇 시간)은 몇 분 걸릴 수 있어서 화면에 보여줌
 */
public record RenderResponse(RenderStatus status, String fileUrl, Integer duration, int progress) {

    public static final RenderResponse NOT_REQUESTED = new RenderResponse(RenderStatus.NOT_REQUESTED, null, null, 0);

    static RenderResponse from(AudioRender render, StorageService storage) {
        boolean done = render.getStatus() == RenderStatus.DONE;
        return new RenderResponse(render.getStatus(),
                done ? storage.publicUrl(render.getFileKey()) : null,
                done ? render.getDuration() : null,
                done ? 100 : render.getProgress() == null ? 0 : render.getProgress());
    }
}
