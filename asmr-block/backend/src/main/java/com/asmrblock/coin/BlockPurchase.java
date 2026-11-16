package com.asmrblock.coin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** 블록 구매 한 건: 받은 코인(bonusCoins) + 충전 코인(paidCoins) = price, 크리에이터 몫 = 충전 코인 × 비율 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockPurchase {

    private Long id;
    private Long buyerId;
    private Long blockId;
    private Long creatorId;
    private int price;
    private int bonusCoins;
    private int paidCoins;
    private int creatorShare;
    private Long settlementId;
    private LocalDateTime createdAt;

    // 크리에이터 판매 목록에서 같이 읽음
    private String blockTitle;
    private String blockTitleEn;
}
