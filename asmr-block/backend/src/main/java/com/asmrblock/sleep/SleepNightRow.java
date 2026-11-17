package com.asmrblock.sleep;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** 남긴 답 (0 건너뜀 · 1 못 잤어요 · 2 그저 그래요 · 3 잘 잤어요) */
@Getter
@Setter
@NoArgsConstructor
public class SleepNightRow {

    private LocalDate night;
    private int rating;
}
