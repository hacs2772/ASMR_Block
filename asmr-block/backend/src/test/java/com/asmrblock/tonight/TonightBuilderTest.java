package com.asmrblock.tonight;

import com.asmrblock.block.Block;
import com.asmrblock.playlist.PlaylistDtos.ItemRequest;
import com.asmrblock.tonight.TonightPlan.Share;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 오늘 밤 조합 쌓기 규칙 (스프링 없이) */
class TonightBuilderTest {

    private static Block block(long id, int seconds) {
        Block b = new Block();
        b.setId(id);
        b.setDuration(seconds);
        b.setPrice(0);
        return b;
    }

    private static final Map<String, List<Block>> CANDIDATES = Map.of(
            "tap", List.of(block(1, 180), block(2, 200), block(3, 240)),
            "whisper", List.of(block(11, 180), block(12, 180)),
            "rain", List.of(block(21, 180), block(22, 240)),
            "nature", List.of(block(31, 200)));

    private static Map<Long, Integer> durations() {
        Map<Long, Integer> d = new HashMap<>();
        CANDIDATES.values().forEach(list -> list.forEach(b -> d.put(b.getId(), b.getDuration())));
        return d;
    }

    private static int total(List<ItemRequest> items) {
        Map<Long, Integer> d = durations();
        return items.stream().mapToInt(i -> i.repeatOrOne() * d.get(i.blockId())).sum();
    }

    @Test
    @DisplayName("첫째 줄: 20분 넘게 · 10개까지 · 비율 2:1을 따름 · 같은 블록이 따로 이어지지 않음")
    void mainRowFollowsWeights() {
        TonightBuilder.Built built = TonightBuilder.build(
                List.of(new Share("tap", 2), new Share("whisper", 1)), List.of(), CANDIDATES);
        assertThat(total(built.main())).isGreaterThanOrEqualTo(TonightBuilder.LOOP_SECONDS);
        assertThat(built.main()).hasSizeLessThanOrEqualTo(TonightBuilder.MAX_MAIN);
        Map<Long, Integer> d = durations();
        int tap = built.main().stream().filter(i -> i.blockId() < 10).mapToInt(i -> i.repeatOrOne() * d.get(i.blockId())).sum();
        int whisper = built.main().stream().filter(i -> i.blockId() > 10).mapToInt(i -> i.repeatOrOne() * d.get(i.blockId())).sum();
        assertThat((double) tap / whisper).isBetween(1.4, 2.8);
        for (int i = 1; i < built.main().size(); i++) {
            assertThat(built.main().get(i).blockId()).isNotEqualTo(built.main().get(i - 1).blockId());
        }
        assertThat(built.layer()).isEmpty();
        assertThat(built.used()).extracting(Block::getId).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("둘째 줄: 30초 뒤부터 · 빈칸을 두고 · 겹치지 않고 · 첫째 줄이 끝나기 전에 끝남 · 비율 퍼센트 합 100")
    void layerRowHasGapsAndNoOverlap() {
        TonightBuilder.Built built = TonightBuilder.build(
                List.of(new Share("tap", 1)), List.of(new Share("rain", 2), new Share("nature", 1)), CANDIDATES);
        List<ItemRequest> layer = built.layer();
        assertThat(layer).isNotEmpty();
        assertThat(layer.getFirst().startSeconds()).isEqualTo(TonightBuilder.LAYER_START);
        Map<Long, Integer> d = durations();
        int mainTotal = total(built.main());
        for (int i = 0; i < layer.size(); i++) {
            int end = layer.get(i).startSeconds() + d.get(layer.get(i).blockId());
            assertThat(end).isLessThanOrEqualTo(mainTotal);
            if (i + 1 < layer.size()) {
                assertThat(layer.get(i + 1).startSeconds() - end).isGreaterThanOrEqualTo(TonightBuilder.LAYER_GAP_MIN);
            }
        }
        assertThat(built.layerShares()).extracting(Share::code).containsExactly("rain", "nature");
        assertThat(TonightBuilder.percents(built.layerShares())).containsExactly(67, 33);
        assertThat(TonightBuilder.percents(List.of(new Share("a", 1), new Share("b", 1), new Share("c", 1))))
                .satisfies(p -> assertThat(p.stream().mapToInt(Integer::intValue).sum()).isEqualTo(100));
    }

    @Test
    @DisplayName("블록이 하나뿐이면 반복으로 20분")
    void singleBlockRepeats() {
        Map<String, List<Block>> one = Map.of("tap", List.of(block(1, 180)));
        TonightBuilder.Built built = TonightBuilder.build(List.of(new Share("tap", 1)), List.of(), one);
        assertThat(built.main()).hasSize(1);
        assertThat(built.main().getFirst().repeatOrOne()).isEqualTo(7);
    }

    @Test
    @DisplayName("첫째 줄 묶음에 블록이 없으면 배경을 첫째 줄로 · 첫째 줄에 있는 묶음은 둘째 줄에서 뺌 · 없는 묶음은 무시")
    void fallbacks() {
        TonightBuilder.Built onlyRain = TonightBuilder.build(
                List.of(new Share("slime", 3)), List.of(new Share("rain", 1)), CANDIDATES);
        assertThat(onlyRain.mainShares()).extracting(Share::code).containsExactly("rain");
        assertThat(onlyRain.layer()).isEmpty();

        TonightBuilder.Built same = TonightBuilder.build(
                List.of(new Share("rain", 1)), List.of(new Share("rain", 1)), CANDIDATES);
        assertThat(same.layer()).isEmpty();

        assertThat(TonightBuilder.build(List.of(new Share("laser", 1)), List.of(), CANDIDATES).isEmpty()).isTrue();
    }

    @Test
    @DisplayName("짧은 블록뿐이어도 둘째 줄이 생김 (시작·빈칸을 한 바퀴 길이에 맞춰 줄임)")
    void shortBlocks() {
        Map<String, List<Block>> shortOnes = Map.of(
                "tap", List.of(block(1, 10), block(2, 12)),
                "rain", List.of(block(21, 8)));
        TonightBuilder.Built built = TonightBuilder.build(List.of(new Share("tap", 1)), List.of(new Share("rain", 1)), shortOnes);
        assertThat(built.layer()).isNotEmpty();
        int mainTotal = built.main().stream().mapToInt(i -> i.repeatOrOne() * (i.blockId() == 1 ? 10 : 12)).sum();
        assertThat(built.layer().getLast().startSeconds() + 8).isLessThanOrEqualTo(mainTotal);
    }
}
