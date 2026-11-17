package com.asmrblock.sleep;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** 잘 잔 밤에 틀었던 조합 하나: 잘 잔 밤 수 · 마지막으로 잘 잔 밤 */
@Getter
@Setter
@NoArgsConstructor
public class GoodComboRow {
    private Long playlistId;
    private int goodNights;
    private LocalDate lastNight;
}
