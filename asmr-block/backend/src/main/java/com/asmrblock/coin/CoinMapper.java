package com.asmrblock.coin;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface CoinMapper {

    Optional<Wallet> findWallet(Long userId);

    /** 코인을 바꾸기 전에 그 사람 줄을 잠금 (같은 사람이 동시에 두 번 사도 차례대로) */
    Optional<Wallet> lockWallet(Long userId);

    void updateWallet(@Param("userId") Long userId, @Param("paid") int paid, @Param("bonus") int bonus);

    void insertTransaction(CoinTransaction tx);

    List<CoinTransaction> findTransactions(@Param("userId") Long userId, @Param("offset") int offset, @Param("limit") int limit);

    long countTransactions(Long userId);

    /** 같은 영수증으로 이미 충전했는지 */
    boolean existsExternalId(String externalId);

    void insertPurchase(BlockPurchase purchase);

    /** 크리에이터 한 사람의 판매 합계 */
    EarningsSummary earnings(Long creatorId);

    /** 최근 판매 (블록 이름과 함께) */
    List<BlockPurchase> recentSales(@Param("creatorId") Long creatorId, @Param("limit") int limit);

    /** 관리자: 판매가 있는 크리에이터 전부 (정산할 몫이 많은 순) */
    List<EarningsSummary> allEarnings();

    void insertSettlement(Settlement settlement);

    /** 정산 안 한 크리에이터 몫을 이 정산으로 표시 → 표시한 줄 수 */
    int markSettled(@Param("creatorId") Long creatorId, @Param("settlementId") Long settlementId);

    /** 정산 금액을 실제로 표시한 몫의 합으로 맞춤 */
    void syncSettlement(@Param("id") Long id, @Param("krwPerCoin") int krwPerCoin);

    Optional<Settlement> findSettlement(Long id);

    /** 관리자: 이메일·닉네임으로 찾기 (q가 비면 최근 가입한 사람) */
    List<UserCoins> searchUsers(@Param("q") String q, @Param("limit") int limit);

    Optional<UserCoins> findUserCoins(Long userId);
}
