package com.asmrblock.render;

import com.asmrblock.storage.StorageService;

/** 완성본 상태. status가 DONE이면 fileUrl을 재생하면 됨 (끊김 없는 하나의 파일) */
public record RenderResponse(RenderStatus status, String fileUrl, Integer duration) {

    public static final RenderResponse NOT_REQUESTED = new RenderResponse(RenderStatus.NOT_REQUESTED, null, null);

    static RenderResponse from(AudioRender render, StorageService storage) {
        boolean done = render.getStatus() == RenderStatus.DONE;
        return new RenderResponse(render.getStatus(),
                done ? storage.publicUrl(render.getFileKey()) : null,
                done ? render.getDuration() : null);
    }
}
