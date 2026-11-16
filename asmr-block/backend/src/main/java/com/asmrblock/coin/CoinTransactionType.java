package com.asmrblock.coin;

/** 코인 내역 종류: GRANT 관리자가 줌·회수 / PURCHASE 블록 구매 / CHARGE 충전(스토어 결제) / REFUND 환불 */
public enum CoinTransactionType {
    GRANT, PURCHASE, CHARGE, REFUND
}
