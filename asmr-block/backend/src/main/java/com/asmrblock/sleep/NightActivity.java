package com.asmrblock.sleep;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 한 밤에 틀었던 조합 하나: 처음 튼 때·넘은 듣기 단계(분, 없으면 0) */
@Getter
@Setter
@NoArgsConstructor
public class NightActivity {

    private LocalDate night;
    private Long playlistId;
    private String title;
    private String titleEn;
    private LocalDateTime firstAt;
    private int minutes;
}
