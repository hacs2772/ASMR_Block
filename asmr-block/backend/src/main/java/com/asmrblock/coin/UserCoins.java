package com.asmrblock.coin;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 관리자 코인 화면: 사람 + 코인 */
@Getter
@Setter
@NoArgsConstructor
public class UserCoins {

    private Long id;
    private String email;
    private String nickname;
    private int coinPaid;
    private int coinBonus;
}
