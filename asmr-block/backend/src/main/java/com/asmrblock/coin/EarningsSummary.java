package com.asmrblock.coin;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 크리에이터 판매 합계. soldCoins = 팔린 코인 전부, bonusCoins = 그중 받은 코인으로 팔린 것(정산 안 됨),
 * earnedCoins = 크리에이터 몫 합계, pendingCoins = 아직 정산 안 한 몫, settledCoins = 정산한 몫
 */
@Getter
@Setter
@NoArgsConstructor
public class EarningsSummary {

    private Long creatorId;
    private String nickname;
    private String email;
    private long salesCount;
    private long soldCoins;
    private long bonusCoins;
    private long earnedCoins;
    private long pendingCoins;
    private long settledCoins;
}
