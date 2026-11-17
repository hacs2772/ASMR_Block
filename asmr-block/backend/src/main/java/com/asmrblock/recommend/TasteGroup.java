package com.asmrblock.recommend;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 내가 좋아하는 트리거 묶음 (취향 점수) */
@Getter
@Setter
@NoArgsConstructor
public class TasteGroup {

    private String code;
    private String name;
    private String nameEn;
    private double weight;
}
