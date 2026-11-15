package com.asmrblock.feedback;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** 의견 보내기 (V9) */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Feedback {

    private Long id;
    private Long userId;
    private String message;
    private String contact;
    private String page;
    private String client;
    private Boolean isDone;
    private LocalDateTime createdAt;

    // 조인 데이터
    private String nickname;
    private String email;
}
