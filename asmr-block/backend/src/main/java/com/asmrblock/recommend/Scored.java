package com.asmrblock.recommend;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 추천 후보 하나: id(블록·조합) + 점수. groupKey = 같은 것끼리 몰리지 않게 나누는 기준(블록이면 소분류) */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Scored {

    private long id;
    private long groupKey;
    private double score;
}
