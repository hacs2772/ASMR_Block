package com.asmrblock.coin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** 코인이 늘고 준 내역 한 줄 (paidAmount·bonusAmount: + 늘어남 / - 줄어듦) */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoinTransaction {

    private Long id;
    private Long userId;
    private CoinTransactionType type;
    private int paidAmount;
    private int bonusAmount;
    private int balanceAfter;
    private Long blockId;
    private Long purchaseId;
    private String note;
    private String externalId;
    private LocalDateTime createdAt;

    // 목록에서 같이 읽음
    private String blockTitle;
    private String blockTitleEn;
}
