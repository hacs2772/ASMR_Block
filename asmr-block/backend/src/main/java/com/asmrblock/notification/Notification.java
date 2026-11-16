package com.asmrblock.notification;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** 알림 한 줄 (V14) */
@Getter
@Setter
public class Notification {
    private Long id;
    private Long userId;
    private NotificationType type;
    private Long blockId;
    private Long playlistId;
    private String title;           // 그때의 블록·조합 이름
    private String note;            // 돌려보낸 이유
    private String actorNickname;   // 마지막으로 담은 사람
    private int count;              // 담은 사람 수 (읽기 전까지 묶음)
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
