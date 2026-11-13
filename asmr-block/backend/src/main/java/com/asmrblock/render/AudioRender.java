package com.asmrblock.render;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** 완성본: 플레이리스트 구성을 합친 하나의 파일. 구성 해시가 같으면 재사용 */
@Getter
@Setter
@NoArgsConstructor
public class AudioRender {

    private Long id;
    private String compositionHash;
    private String compositionJson;
    private RenderStatus status;
    private String fileKey;
    private Integer duration;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
