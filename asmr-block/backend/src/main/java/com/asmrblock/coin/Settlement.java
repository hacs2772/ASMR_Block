package com.asmrblock.coin;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** 정산 기록: 관리자가 크리에이터에게 coins(= krw원)를 보냈다고 표시 */
@Getter
@Setter
@NoArgsConstructor
public class Settlement {

    private Long id;
    private Long creatorId;
    private int coins;
    private int krw;
    private String note;
    private LocalDateTime createdAt;
}
