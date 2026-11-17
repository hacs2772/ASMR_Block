package com.asmrblock.tonight;

import com.asmrblock.block.Block;
import com.asmrblock.playlist.PlaylistDtos;
import com.asmrblock.playlist.PlaylistDtos.ItemRequest;
import com.asmrblock.tonight.TonightPlan.Share;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 계획(트리거 비율) + 후보 블록 → 두 줄 조합 (스프링 없이, 순수 계산 — TonightBuilderTest).
 * 첫째 줄: 20분 안팎이 될 때까지 비율이 가장 모자란 묶음의 블록을 차례로 (같은 묶음 안에서는 블록을 돌아가며, 같은 블록이 이어지면 repeat로)
 * 둘째 줄: 배경 묶음 블록을 조금 뒤부터 사이사이 빈칸을 두고 (겹치지 않고, 첫째 줄이 끝나기 전에 끝나게)
 */
public final class TonightBuilder {

    /** 한 바퀴 목표 길이 (플레이어가 "얼마나 들을까요" 동안 반복) */
    static final int LOOP_SECONDS = 20 * 60;
    static final int MAX_MAIN = 10;
    static final int MAX_LAYER = 20;
    /** 둘째 줄: 처음 시작(초)·빈칸 최소·최대 (짧은 블록뿐이면 한 바퀴 길이에 맞춰 줄임) */
    static final int LAYER_START = 30;
    static final int LAYER_GAP_MIN = 40;
    static final int LAYER_GAP_MAX = 150;

    private TonightBuilder() {
    }

    /** 쌓은 결과: 두 줄 + 실제로 쓴 블록 (무료 블록을 블록함에 담을 때) + 실제로 쓴 묶음 비율 */
    public record Built(List<ItemRequest> main, List<ItemRequest> layer, List<Block> used,
                        List<Share> mainShares, List<Share> layerShares) {

        public boolean isEmpty() {
            return main.isEmpty();
        }
    }

    /**
     * @param candidates 묶음 코드 → 쓸 블록들 (앞에 있는 것부터 씀)
     */
    public static Built build(List<Share> mainShares, List<Share> layerShares, Map<String, List<Block>> candidates) {
        List<Share> main = available(mainShares, candidates, Set.of());
        List<Share> layer = available(layerShares, candidates, codes(main));
        if (main.isEmpty()) { // 첫째 줄 묶음에 블록이 없으면 배경 묶음을 첫째 줄로
            main = layer;
            layer = List.of();
        }
        List<Block> used = new ArrayList<>();
        List<ItemRequest> mainItems = mainRow(main, candidates, used);
        int mainTotal = mainItems.stream().mapToInt(i -> i.repeatOrOne() * durationOf(i.blockId(), used)).sum();
        List<ItemRequest> layerItems = layer.isEmpty() ? List.of() : layerRow(layer, candidates, mainTotal, used);
        if (layerItems.isEmpty()) {
            layer = List.of();
        }
        return new Built(mainItems, layerItems, List.copyOf(new LinkedHashSet<>(used)), main, layer);
    }

    private static List<ItemRequest> mainRow(List<Share> shares, Map<String, List<Block>> candidates, List<Block> used) {
        List<ItemRequest> items = new ArrayList<>();
        if (shares.isEmpty()) return items;
        Map<String, Integer> next = new HashMap<>();
        Map<String, Double> seconds = new HashMap<>();
        double weightSum = shares.stream().mapToDouble(Share::weight).sum();
        int total = 0;
        int pieces = 0;
        while (total < LOOP_SECONDS && pieces < MAX_MAIN * 4) {
            Share pick = mostBehind(shares, seconds, weightSum, total);
            Block b = nextBlock(pick.code(), candidates, next);
            int d = Math.max(1, b.getDuration());
            used.add(b);
            ItemRequest last = items.isEmpty() ? null : items.getLast();
            if (last != null && last.blockId().equals(b.getId()) && last.repeatOrOne() < PlaylistDtos.MAX_REPEAT) {
                items.set(items.size() - 1, new ItemRequest(b.getId(), last.repeatOrOne() + 1, null));
            } else {
                if (items.size() >= MAX_MAIN) break;
                items.add(new ItemRequest(b.getId(), 1, null));
            }
            seconds.merge(pick.code(), (double) d, Double::sum);
            total += d;
            pieces++;
        }
        return items;
    }

    private static List<ItemRequest> layerRow(List<Share> shares, Map<String, List<Block>> candidates, int mainTotal,
                                              List<Block> used) {
        List<ItemRequest> items = new ArrayList<>();
        Map<String, Integer> next = new HashMap<>();
        Map<String, Double> seconds = new HashMap<>();
        double weightSum = shares.stream().mapToDouble(Share::weight).sum();
        int start = Math.min(LAYER_START, mainTotal / 10);
        int gapMin = Math.max(1, Math.min(LAYER_GAP_MIN, mainTotal / 10));
        int placed = 0;
        while (items.size() < MAX_LAYER) {
            Share pick = mostBehind(shares, seconds, weightSum, placed);
            Block b = nextBlock(pick.code(), candidates, next);
            int d = Math.max(1, b.getDuration());
            if (start + d > mainTotal) break;
            used.add(b);
            items.add(new ItemRequest(b.getId(), 1, start));
            seconds.merge(pick.code(), (double) d, Double::sum);
            placed += d;
            int gap = Math.max(gapMin, Math.min(LAYER_GAP_MAX, (int) Math.round(d * 0.6)));
            start += d + gap;
        }
        return items;
    }

    /** 비율에 비해 가장 덜 나온 묶음 (같으면 앞에 있는 것) */
    private static Share mostBehind(List<Share> shares, Map<String, Double> seconds, double weightSum, int total) {
        Share best = shares.getFirst();
        double bestGap = Double.NEGATIVE_INFINITY;
        for (Share s : shares) {
            double gap = (s.weight() / weightSum) * (total + 1) - seconds.getOrDefault(s.code(), 0.0);
            if (gap > bestGap + 1e-9) {
                best = s;
                bestGap = gap;
            }
        }
        return best;
    }

    private static Block nextBlock(String code, Map<String, List<Block>> candidates, Map<String, Integer> next) {
        List<Block> blocks = candidates.get(code);
        int i = next.merge(code, 1, Integer::sum) - 1;
        return blocks.get(i % blocks.size());
    }

    /** 블록이 있는 묶음만, 같은 묶음은 한 번 (비율은 더함), 0 이하 비율은 뺌 */
    private static List<Share> available(List<Share> shares, Map<String, List<Block>> candidates, Set<String> exclude) {
        Map<String, Double> merged = new LinkedHashMap<>();
        for (Share s : shares == null ? List.<Share>of() : shares) {
            List<Block> blocks = candidates.get(s.code());
            if (s.weight() > 0 && blocks != null && !blocks.isEmpty() && !exclude.contains(s.code())) {
                merged.merge(s.code(), s.weight(), Double::sum);
            }
        }
        List<Share> out = new ArrayList<>();
        merged.forEach((code, w) -> out.add(new Share(code, w)));
        return out;
    }

    private static Set<String> codes(List<Share> shares) {
        Set<String> codes = new LinkedHashSet<>();
        shares.forEach(s -> codes.add(s.code()));
        return codes;
    }

    private static int durationOf(Long blockId, List<Block> used) {
        for (Block b : used) {
            if (b.getId().equals(blockId)) return Math.max(1, b.getDuration());
        }
        return 1;
    }

    /** 비율 → 퍼센트 (합이 100이 되게, 남는 건 큰 쪽에) */
    public static List<Integer> percents(List<Share> shares) {
        List<Integer> out = new ArrayList<>();
        double sum = shares.stream().mapToDouble(Share::weight).sum();
        if (shares.isEmpty() || sum <= 0) return out;
        int given = 0;
        int biggest = 0;
        for (int i = 0; i < shares.size(); i++) {
            int p = (int) Math.floor(shares.get(i).weight() * 100 / sum);
            out.add(p);
            given += p;
            if (shares.get(i).weight() > shares.get(biggest).weight()) biggest = i;
        }
        out.set(biggest, out.get(biggest) + (100 - given));
        return out;
    }
}
