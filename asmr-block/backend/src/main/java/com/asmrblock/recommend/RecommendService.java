package com.asmrblock.recommend;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockMapper;
import com.asmrblock.block.BlockService;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSummaryResponse;
import com.asmrblock.playlist.PlaylistService;
import com.asmrblock.recommend.RecommendDtos.BlockRecommendations;
import com.asmrblock.recommend.RecommendDtos.ComboRecommendations;
import com.asmrblock.recommend.RecommendDtos.TasteTrigger;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 나에게 맞는 추천 (로그인한 사람). 취향 점수는 RecommendMapper.xml 참고.
 * 취향에 맞는 게 모자라면(막 가입했거나 기록이 적으면) 요즘 인기로 채움 — 그래서 목록이 비지 않음
 */
@Service
@RequiredArgsConstructor
public class RecommendService {

    private static final int TRENDING_DAYS = 14;
    /** 같은 소분류 블록은 처음엔 2개까지만 (한 가지 소리만 줄줄이 나오지 않게) */
    private static final int PER_CATEGORY = 2;

    private final RecommendMapper recommendMapper;
    private final BlockMapper blockMapper;
    private final BlockService blockService;
    private final PlaylistService playlistService;

    @Transactional(readOnly = true)
    public BlockRecommendations blocks(Long userId, int size) {
        int limit = Math.min(Math.max(size, 1), 30);
        List<Long> ids = diversify(recommendMapper.blockScores(userId, limit * 4), limit, PER_CATEGORY);
        Map<Long, Block> byId = ids.isEmpty() ? Map.of()
                : blockMapper.findByIds(ids).stream().collect(Collectors.toMap(Block::getId, Function.identity()));
        List<BlockResponse> result = new ArrayList<>(blockService.responses(
                ids.stream().map(byId::get).filter(Objects::nonNull).toList(), userId));
        boolean personalized = !result.isEmpty();
        if (result.size() < limit) {
            Set<Long> shown = result.stream().map(BlockResponse::id).collect(Collectors.toCollection(HashSet::new));
            blockService.trending(TRENDING_DAYS, limit * 3, userId).stream()
                    .filter(b -> !b.owned() && !shown.contains(b.id())
                            && (b.uploader() == null || !Objects.equals(b.uploader().id(), userId)))
                    .limit(limit - result.size())
                    .forEach(result::add);
        }
        return new BlockRecommendations(personalized, personalized ? triggers(userId) : List.of(), result);
    }

    @Transactional(readOnly = true)
    public ComboRecommendations combos(Long userId, int size) {
        int limit = Math.min(Math.max(size, 1), 30);
        List<Long> ids = recommendMapper.comboScores(userId, limit).stream().map(Scored::getId).toList();
        List<PlaylistSummaryResponse> result = new ArrayList<>(playlistService.publicSummaries(ids, userId));
        boolean personalized = !result.isEmpty();
        if (result.size() < limit) {
            Set<Long> shown = result.stream().map(PlaylistSummaryResponse::id).collect(Collectors.toCollection(HashSet::new));
            playlistService.trending(TRENDING_DAYS, limit * 3, userId).stream()
                    .filter(c -> !shown.contains(c.id()) && !Objects.equals(c.owner().id(), userId)
                            && (c.collect() == null || c.collect().collectedId() == null))
                    .limit(limit - result.size())
                    .forEach(result::add);
        }
        return new ComboRecommendations(personalized, personalized ? triggers(userId) : List.of(), result);
    }

    private List<TasteTrigger> triggers(Long userId) {
        return recommendMapper.tasteGroups(userId, 3).stream().map(TasteTrigger::from).toList();
    }

    /**
     * 점수 순서를 지키면서 같은 groupKey(소분류)는 처음엔 perGroup개까지만 → 모자라면 남은 것을 점수 순으로 채움
     */
    static List<Long> diversify(List<Scored> rows, int limit, int perGroup) {
        Set<Long> picked = new LinkedHashSet<>();
        Map<Long, Integer> count = new HashMap<>();
        for (Scored r : rows) {
            if (picked.size() >= limit) {
                break;
            }
            if (count.merge(r.getGroupKey(), 1, Integer::sum) <= perGroup) {
                picked.add(r.getId());
            }
        }
        for (Scored r : rows) {
            if (picked.size() >= limit) {
                break;
            }
            picked.add(r.getId());
        }
        return new ArrayList<>(picked);
    }
}
