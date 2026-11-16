package com.asmrblock.coin;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 내 코인: coinPaid = 충전한 코인(돈 낸 것), coinBonus = 받은 코인(관리자 지급·이벤트, 먼저 씀) */
@Getter
@Setter
@NoArgsConstructor
public class Wallet {

    private int coinPaid;
    private int coinBonus;

    public Wallet(int coinPaid, int coinBonus) {
        this.coinPaid = coinPaid;
        this.coinBonus = coinBonus;
    }

    public int balance() {
        return coinPaid + coinBonus;
    }
}
