package com.asmrblock.coin;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockService;
import com.asmrblock.coin.CoinDtos.CreatorEarningResponse;
import com.asmrblock.coin.CoinDtos.EarningsResponse;
import com.asmrblock.coin.CoinDtos.GrantRequest;
import com.asmrblock.coin.CoinDtos.PurchaseResponse;
import com.asmrblock.coin.CoinDtos.SaleResponse;
import com.asmrblock.coin.CoinDtos.TransactionResponse;
import com.asmrblock.coin.CoinDtos.UserCoinResponse;
import com.asmrblock.coin.CoinDtos.WalletResponse;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.config.AppProperties;
import com.asmrblock.library.LibraryMapper;
import com.asmrblock.library.LibrarySource;
import com.asmrblock.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 코인: 내 코인·내역, 블록 구매, 크리에이터 수익, 관리자 지급·정산.
 * 코인은 두 가지 — 충전 코인(paid, 돈 낸 것)과 받은 코인(bonus, 관리자 지급·이벤트). 쓸 때는 받은 코인부터.
 * 크리에이터 몫은 충전 코인으로 팔린 부분 × app.coins.creator-share-percent (받은 코인은 진짜 돈이 아니라 정산 안 됨).
 * 코인을 바꿀 때는 그 사람 줄을 잠가서(FOR UPDATE) 동시에 두 번 눌러도 두 번 빠지지 않게
 */
@Service
@RequiredArgsConstructor
public class CoinService {

    private static final int RECENT_SALES = 20;
    private static final int SEARCH_LIMIT = 20;

    private final CoinMapper coinMapper;
    private final LibraryMapper libraryMapper;
    private final BlockService blockService;
    private final NotificationService notificationService;
    private final AppProperties properties;

    /** 블록 하나 산 결과. alreadyOwned = 이미 내 블록함에 있어서 코인을 안 씀 */
    public record PurchaseResult(PurchaseResponse response, boolean alreadyOwned) {
    }

    @Transactional(readOnly = true)
    public WalletResponse wallet(Long userId) {
        return WalletResponse.of(findWallet(userId));
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> transactions(Long userId, PageQuery page) {
        return PageResponse.of(coinMapper.findTransactions(userId, page.offset(), page.size()).stream()
                .map(TransactionResponse::from).toList(), page, coinMapper.countTransactions(userId));
    }

    /** 유료 블록 하나 사기 → 내 블록함에 (이미 있으면 코인을 쓰지 않음) */
    @Transactional
    public PurchaseResult purchaseBlock(Long userId, Long blockId) {
        Block block = blockService.findPlayable(blockId);
        if (!block.isPaid()) {
            throw ApiException.badRequest("무료 블록은 바로 담으면 돼요.");
        }
        int bought = buy(userId, List.of(block));
        return new PurchaseResult(new PurchaseResponse(blockService.toResponse(block, userId), wallet(userId)), bought == 0);
    }

    /**
     * 유료 블록 여러 개를 한 번에 사기 (조합 담기에서도 씀). 이미 가진 것·무료는 건너뜀.
     * 코인이 모자라면 하나도 사지 않고 402 NOT_ENOUGH_COINS → 산 개수
     */
    @Transactional
    public int buy(Long userId, List<Block> blocks) {
        Wallet wallet = coinMapper.lockWallet(userId).orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
        Map<Long, Block> paid = new LinkedHashMap<>();
        blocks.stream().filter(Block::isPaid).forEach(b -> paid.putIfAbsent(b.getId(), b));
        if (paid.isEmpty()) {
            return 0;
        }
        // 잠근 뒤에 다시 확인 (같은 블록을 동시에 두 번 사지 않게)
        Set<Long> owned = new HashSet<>(libraryMapper.findOwnedIds(userId, paid.keySet()));
        List<Block> toBuy = paid.values().stream().filter(b -> !owned.contains(b.getId())).toList();
        int total = toBuy.stream().mapToInt(Block::getPrice).sum();
        if (total > wallet.balance()) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "NOT_ENOUGH_COINS",
                    "코인이 모자라요. %d코인이 필요한데 지금 %d코인 있어요.".formatted(total, wallet.balance()));
        }
        int sharePercent = properties.coins().creatorSharePercent();
        for (Block block : toBuy) {
            int price = block.getPrice();
            int bonusUsed = Math.min(wallet.getCoinBonus(), price);
            int paidUsed = price - bonusUsed;
            wallet.setCoinBonus(wallet.getCoinBonus() - bonusUsed);
            wallet.setCoinPaid(wallet.getCoinPaid() - paidUsed);
            BlockPurchase purchase = BlockPurchase.builder()
                    .buyerId(userId).blockId(block.getId()).creatorId(block.getUploaderId())
                    .price(price).bonusCoins(bonusUsed).paidCoins(paidUsed)
                    .creatorShare(paidUsed * sharePercent / 100)
                    .build();
            coinMapper.insertPurchase(purchase);
            libraryMapper.insert(userId, block.getId(), LibrarySource.PURCHASE);
            coinMapper.insertTransaction(CoinTransaction.builder()
                    .userId(userId).type(CoinTransactionType.PURCHASE)
                    .paidAmount(-paidUsed).bonusAmount(-bonusUsed).balanceAfter(wallet.balance())
                    .blockId(block.getId()).purchaseId(purchase.getId())
                    .build());
            notificationService.blockCollected(block, userId);
        }
        coinMapper.updateWallet(userId, wallet.getCoinPaid(), wallet.getCoinBonus());
        return toBuy.size();
    }

    /**
     * 충전: 스토어 결제(인앱결제) 영수증을 확인한 뒤 부를 곳 — 아직 결제 화면은 없음.
     * externalId(영수증 번호)가 같으면 한 번만 들어감
     */
    @Transactional
    public WalletResponse charge(Long userId, int coins, String externalId, String note) {
        if (coins <= 0) {
            throw new IllegalArgumentException("충전 코인은 1 이상이어야 해요.");
        }
        Wallet wallet = coinMapper.lockWallet(userId).orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
        if (externalId != null && coinMapper.existsExternalId(externalId)) {
            return WalletResponse.of(wallet);
        }
        wallet.setCoinPaid(wallet.getCoinPaid() + coins);
        coinMapper.updateWallet(userId, wallet.getCoinPaid(), wallet.getCoinBonus());
        coinMapper.insertTransaction(CoinTransaction.builder()
                .userId(userId).type(CoinTransactionType.CHARGE).paidAmount(coins).balanceAfter(wallet.balance())
                .externalId(externalId).note(note)
                .build());
        return WalletResponse.of(wallet);
    }

    /** 내 판매 수익 (크리에이터) */
    @Transactional(readOnly = true)
    public EarningsResponse earnings(Long creatorId) {
        EarningsSummary e = coinMapper.earnings(creatorId);
        int krwPerCoin = properties.coins().krwPerCoin();
        List<SaleResponse> recent = coinMapper.recentSales(creatorId, RECENT_SALES).stream().map(SaleResponse::from).toList();
        return new EarningsResponse(properties.coins().creatorSharePercent(), krwPerCoin, e.getSalesCount(), e.getSoldCoins(),
                e.getBonusCoins(), e.getEarnedCoins(), e.getPendingCoins(), e.getPendingCoins() * krwPerCoin,
                e.getSettledCoins(), recent);
    }

    // ---- 관리자 ----

    @Transactional(readOnly = true)
    public List<UserCoinResponse> searchUsers(String q) {
        String query = q == null || q.isBlank() ? null : q.trim();
        return coinMapper.searchUsers(query, SEARCH_LIMIT).stream().map(UserCoinResponse::from).toList();
    }

    /** 코인 주기(+) · 회수(-): 받은 코인(bonus)으로만. 그 사람 내역에 note와 함께 남음 */
    @Transactional
    public UserCoinResponse grant(GrantRequest request) {
        int amount = request.amount();
        int max = properties.coins().grantMax();
        if (amount == 0 || Math.abs(amount) > max) {
            throw ApiException.badRequest("코인은 1~%d개 사이로 적어 주세요. (회수는 앞에 -)".formatted(max));
        }
        Wallet wallet = coinMapper.lockWallet(request.userId())
                .orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
        if (amount < 0 && wallet.getCoinBonus() < -amount) {
            throw ApiException.badRequest("회수할 받은 코인이 모자라요. 지금 받은 코인은 %d개예요.".formatted(wallet.getCoinBonus()));
        }
        wallet.setCoinBonus(wallet.getCoinBonus() + amount);
        coinMapper.updateWallet(request.userId(), wallet.getCoinPaid(), wallet.getCoinBonus());
        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        coinMapper.insertTransaction(CoinTransaction.builder()
                .userId(request.userId()).type(CoinTransactionType.GRANT).bonusAmount(amount)
                .balanceAfter(wallet.balance()).note(note)
                .build());
        return coinMapper.findUserCoins(request.userId()).map(UserCoinResponse::from)
                .orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
    }

    @Transactional(readOnly = true)
    public List<CreatorEarningResponse> allEarnings() {
        int krwPerCoin = properties.coins().krwPerCoin();
        return coinMapper.allEarnings().stream().map(e -> CreatorEarningResponse.from(e, krwPerCoin)).toList();
    }

    /** 정산 완료로 표시: 아직 정산 안 한 크리에이터 몫 전부 (실제 송금은 관리자가 직접) → 표시한 코인 */
    @Transactional
    public Settlement settle(Long creatorId, String note) {
        EarningsSummary e = coinMapper.earnings(creatorId);
        if (e.getPendingCoins() <= 0) {
            throw ApiException.badRequest("정산할 코인이 없어요.");
        }
        Settlement settlement = new Settlement();
        settlement.setCreatorId(creatorId);
        settlement.setCoins((int) e.getPendingCoins());
        settlement.setKrw((int) e.getPendingCoins() * properties.coins().krwPerCoin());
        settlement.setNote(note == null || note.isBlank() ? null : note.trim());
        coinMapper.insertSettlement(settlement);
        coinMapper.markSettled(creatorId, settlement.getId());
        // 위에서 센 뒤 사이에 팔린 것까지 표시됐을 수 있으니 실제로 표시한 몫으로 맞춤
        coinMapper.syncSettlement(settlement.getId(), properties.coins().krwPerCoin());
        return coinMapper.findSettlement(settlement.getId()).orElse(settlement);
    }

    private Wallet findWallet(Long userId) {
        return coinMapper.findWallet(userId).orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
    }
}
