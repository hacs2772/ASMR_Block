package com.asmrblock.coin;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.i18n.Lang;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

/** 코인 요청·응답 (시간 at은 UTC, 웹·앱 lib/time이 "5분 전"으로) */
public final class CoinDtos {

    private CoinDtos() {
    }

    static OffsetDateTime utc(LocalDateTime time) {
        return time == null ? null : time.atOffset(ZoneOffset.UTC);
    }

    /** 내 코인: balance = 쓸 수 있는 코인 전부, paid = 충전한 코인, bonus = 받은 코인(먼저 씀) */
    public record WalletResponse(int balance, int paid, int bonus) {
        static WalletResponse of(Wallet wallet) {
            return new WalletResponse(wallet.balance(), wallet.getCoinPaid(), wallet.getCoinBonus());
        }
    }

    /**
     * 코인 내역 한 줄. amount = 바뀐 코인(+ 늘어남 / - 줄어듦) = paidAmount + bonusAmount.
     * PURCHASE면 blockId·blockTitle(지금 화면 언어), GRANT면 note = 관리자가 적은 이유
     */
    public record TransactionResponse(Long id, CoinTransactionType type, int amount, int paidAmount, int bonusAmount,
                                      int balanceAfter, Long blockId, String blockTitle, String note, OffsetDateTime at) {
        static TransactionResponse from(CoinTransaction t) {
            return new TransactionResponse(t.getId(), t.getType(), t.getPaidAmount() + t.getBonusAmount(),
                    t.getPaidAmount(), t.getBonusAmount(), t.getBalanceAfter(), t.getBlockId(),
                    Lang.pick(t.getBlockTitle(), t.getBlockTitleEn()), t.getNote(), utc(t.getCreatedAt()));
        }
    }

    /** 블록을 샀을 때: 산 블록(이제 내 것) + 남은 코인 */
    public record PurchaseResponse(BlockResponse block, WalletResponse wallet) {
    }

    /** 크리에이터 판매 한 건: share = 크리에이터 몫 (충전 코인으로 팔린 부분 × 비율) */
    public record SaleResponse(Long blockId, String title, int price, int paidCoins, int share, OffsetDateTime at) {
        static SaleResponse from(BlockPurchase p) {
            return new SaleResponse(p.getBlockId(), Lang.pick(p.getBlockTitle(), p.getBlockTitleEn()), p.getPrice(),
                    p.getPaidCoins(), p.getCreatorShare(), utc(p.getCreatedAt()));
        }
    }

    /**
     * 내 판매 수익 (크리에이터). sharePercent = 크리에이터 몫(%), krwPerCoin = 1코인이 몇 원.
     * salesCount·soldCoins = 팔린 횟수·코인, bonusSoldCoins = 그중 받은 코인으로 팔린 것(정산 안 됨),
     * earnedCoins = 내 몫 합계, pendingCoins·pendingKrw = 아직 정산 안 한 몫, settledCoins = 정산 받은 몫
     */
    public record EarningsResponse(int sharePercent, int krwPerCoin, long salesCount, long soldCoins, long bonusSoldCoins,
                                   long earnedCoins, long pendingCoins, long pendingKrw, long settledCoins,
                                   List<SaleResponse> recent) {
    }

    // ---- 관리자 ----

    /** 관리자 코인 화면의 사람 한 줄 */
    public record UserCoinResponse(Long id, String email, String nickname, int paid, int bonus, int balance) {
        static UserCoinResponse from(UserCoins u) {
            return new UserCoinResponse(u.getId(), u.getEmail(), u.getNickname(), u.getCoinPaid(), u.getCoinBonus(),
                    u.getCoinPaid() + u.getCoinBonus());
        }
    }

    /** 관리자: 코인 주기(+) · 회수(-, 받은 코인에서만). note = 이유 (그 사람 내역에 보임) */
    public record GrantRequest(
            @NotNull(message = "코인을 줄 사람을 골라 주세요.")
            Long userId,
            @NotNull(message = "코인 수를 적어 주세요.")
            Integer amount,
            @Size(max = 200, message = "메모는 200자까지 적을 수 있어요.")
            String note) {
    }

    /** 관리자: 크리에이터 정산 목록 한 줄 */
    public record CreatorEarningResponse(Long creatorId, String nickname, String email, long salesCount, long soldCoins,
                                         long bonusSoldCoins, long earnedCoins, long pendingCoins, long pendingKrw,
                                         long settledCoins) {
        static CreatorEarningResponse from(EarningsSummary e, int krwPerCoin) {
            return new CreatorEarningResponse(e.getCreatorId(), e.getNickname(), e.getEmail(), e.getSalesCount(),
                    e.getSoldCoins(), e.getBonusCoins(), e.getEarnedCoins(), e.getPendingCoins(),
                    e.getPendingCoins() * krwPerCoin, e.getSettledCoins());
        }
    }

    /** 관리자: 정산 완료로 표시 (실제 송금은 직접, note = 송금 메모) */
    public record SettleRequest(
            @Size(max = 200, message = "메모는 200자까지 적을 수 있어요.")
            String note) {
    }
}
