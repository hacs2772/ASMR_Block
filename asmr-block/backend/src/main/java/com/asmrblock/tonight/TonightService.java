package com.asmrblock.tonight;

import com.asmrblock.block.Block;
import com.asmrblock.category.CategoryMapper;
import com.asmrblock.category.SoundCategory;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.RateLimiter;
import com.asmrblock.config.AppProperties;
import com.asmrblock.i18n.Lang;
import com.asmrblock.i18n.Messages;
import com.asmrblock.library.LibraryService;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSaveRequest;
import com.asmrblock.playlist.PlaylistDtos.TrackRequest;
import com.asmrblock.playlist.PlaylistService;
import com.asmrblock.recommend.RecommendMapper;
import com.asmrblock.recommend.TasteGroup;
import com.asmrblock.render.RenderService;
import com.asmrblock.sleep.SleepService;
import com.asmrblock.tonight.TonightDtos.TonightInfo;
import com.asmrblock.tonight.TonightDtos.TonightRequest;
import com.asmrblock.tonight.TonightDtos.TriggerShare;
import com.asmrblock.tonight.TonightPlan.Share;
import com.asmrblock.tonight.TonightPlan.Source;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 오늘 밤 조합: 한 줄("비 오는 날 카페에서 책 읽는 느낌") 또는 내 취향으로 트리거 비율을 정하고 → 두 줄 조합을 쌓아 완성본까지 바로 시작.
 * 비율 정하기: ① AI(Claude, 키가 있고 오늘 횟수가 남았을 때) → ② 한 줄의 낱말 → ③ 내 취향(담은 블록·들은 기록) → ④ 기본 조합.
 * 쌓기는 늘 규칙({@link TonightBuilder}): 내 블록함 블록 + 상점의 무료 블록만 (무료는 저절로 담음), 아직 없는 유료 블록은 안 씀
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TonightService {

    static final String FEATURE = "TONIGHT";
    /** 후보: 묶음마다 이만큼 받아서 섞은 뒤 USE_PER_GROUP개 (밤마다 조금씩 다르게) */
    static final int CANDIDATES_PER_GROUP = 5;
    static final int USE_PER_GROUP = 3;
    static final int DEFAULT_LISTEN_MINUTES = 60;
    static final double LAYER_VOLUME = 0.4;
    /** 기록이 없을 때 기본: 첫째 줄 · 둘째 줄 (있는 것 중 앞에서부터) */
    static final List<String> STARTER_MAIN = List.of("tap", "crinkle", "whisper", "scratch", "slime", "cut");
    static final List<String> STARTER_LAYER = List.of("rain", "nature", "noise", "place");

    private final CategoryMapper categoryMapper;
    private final TonightMapper tonightMapper;
    private final RecommendMapper recommendMapper;
    private final LibraryService libraryService;
    private final PlaylistService playlistService;
    private final RenderService renderService;
    private final ClaudePlanner claudePlanner;
    private final WordPlanner wordPlanner;
    private final AiUsageService aiUsageService;
    private final SleepService sleepService;
    private final RateLimiter rateLimiter;
    private final AppProperties properties;
    private final Random random = new Random();

    /** 만든 결과 */
    public record Result(Playlist playlist, Source source, String note, List<TriggerShare> main, List<TriggerShare> layer) {
    }

    public TonightInfo info(Long userId) {
        boolean ai = claudePlanner.enabled();
        return new TonightInfo(ai, TonightDtos.MAX_PROMPT, ai && userId != null ? aiUsageService.leftToday(userId) : null);
    }

    public Result make(Long userId, TonightRequest request) {
        rateLimiter.check("tonight:" + userId, properties.ai().tonightPerHour(), Duration.ofHours(1),
                "오늘 밤 조합을 너무 자주 만들었어요. 조금 뒤에 다시 해 주세요.");

        // 1) 고를 수 있는 묶음 = 블록이 있는 것 (내 블록함 + 상점의 무료 블록)
        Map<String, TriggerGroup> groups = groups();
        Map<String, List<Block>> candidates = candidates(userId, groups.keySet());
        List<TriggerGroup> available = groups.values().stream().filter(g -> candidates.containsKey(g.code())).toList();
        if (available.isEmpty()) {
            throw ApiException.badRequest("아직 쌓을 블록이 없어요. 블록 상점에서 블록을 먼저 담아 주세요.");
        }

        // 2) 비율 정하기
        String sentence = clean(request.prompt());
        String note = null;
        TonightPlan plan = null;
        if (sentence != null) {
            if (claudePlanner.enabled()) {
                if (aiUsageService.leftToday(userId) > 0) {
                    plan = askAi(userId, sentence, available);
                    if (plan == null) note = "AI_FAILED";
                } else {
                    note = "AI_LIMIT";
                }
            }
            if (plan == null) plan = fromWords(sentence, groups, candidates);
            if (plan == null) note = "NO_MATCH";
        }
        if (plan == null) plan = fromTaste(userId, groups, candidates);
        if (plan == null) plan = starter(candidates);

        // 3) 쌓기
        TonightBuilder.Built built = TonightBuilder.build(plan.main(), plan.layer(), candidates);
        if (built.isEmpty()) {
            plan = starter(candidates);
            built = TonightBuilder.build(plan.main(), plan.layer(), candidates);
        }
        if (built.isEmpty()) {
            throw ApiException.badRequest("아직 쌓을 블록이 없어요. 블록 상점에서 블록을 먼저 담아 주세요.");
        }
        libraryService.addFree(userId, built.used().stream().filter(b -> b.getPrice() == null || b.getPrice() == 0)
                .map(Block::getId).toList());

        List<TriggerShare> mainShares = shares(built.mainShares(), groups);
        List<TriggerShare> layerShares = shares(built.layerShares(), groups);
        String title = plan.title() != null ? plan.title() : ruleTitle(mainShares, layerShares);
        int listen = request.listenMinutes() == null ? DEFAULT_LISTEN_MINUTES : request.listenMinutes();
        Playlist playlist = playlistService.create(userId, new PlaylistSaveRequest(
                title, plan.source() == Source.AI || plan.source() == Source.WORDS ? sentence : null, false,
                new TrackRequest(1.0, built.main()),
                built.layer().isEmpty() ? null : new TrackRequest(LAYER_VOLUME, built.layer()),
                listen));
        try {
            renderService.request(playlist.getId(), userId);
        } catch (RuntimeException e) {
            // 완성본은 듣기 화면이 다시 요청함
            log.warn("오늘 밤 조합 완성본 요청 실패: {}", e.getMessage());
        }
        return new Result(playlist, plan.source(), note, mainShares, layerShares);
    }

    // ---------------------------------------------------------------- 비율 정하기

    private TonightPlan askAi(Long userId, String sentence, List<TriggerGroup> available) {
        // 잠 기록: 잘 잔 밤에 많이 들은 트리거도 알려 줌 (한 줄이 먼저)
        ClaudePlanner.Answer answer = claudePlanner.ask(sentence, available, Lang.english(), sleepService.goodTriggerCodes(userId));
        aiUsageService.record(userId, FEATURE, claudePlanner.model(), answer.inputTokens(), answer.outputTokens(),
                answer.ok(), answer.error());
        if (!answer.ok()) return null;
        return new TonightPlan(Source.AI, answer.title(), answer.main(), answer.layer());
    }

    /** 한 줄의 낱말: 앞소리 묶음 → 첫째 줄(3개까지), 배경 묶음 → 둘째 줄(2개까지). 배경뿐이면 그게 첫째 줄 */
    TonightPlan fromWords(String sentence, Map<String, TriggerGroup> groups, Map<String, List<Block>> candidates) {
        Map<String, Integer> hits = wordPlanner.match(sentence);
        List<Share> front = new ArrayList<>();
        List<Share> back = new ArrayList<>();
        hits.forEach((code, n) -> {
            TriggerGroup g = groups.get(code);
            if (g == null || !candidates.containsKey(code)) return;
            (g.ambient() ? back : front).add(new Share(code, n));
        });
        if (front.isEmpty() && back.isEmpty()) return null;
        if (front.isEmpty()) return new TonightPlan(Source.WORDS, null, top(back, 3), List.of());
        return new TonightPlan(Source.WORDS, null, top(front, 3), top(back, 2));
    }

    /** 내 취향: 앞소리 묶음 → 첫째 줄, 좋아하는 배경 하나 → 둘째 줄 (배경 취향이 없으면 빗소리처럼 기본 배경) */
    TonightPlan fromTaste(Long userId, Map<String, TriggerGroup> groups, Map<String, List<Block>> candidates) {
        List<TasteGroup> taste = recommendMapper.tasteGroups(userId, 10);
        List<Share> front = new ArrayList<>();
        List<Share> back = new ArrayList<>();
        for (TasteGroup t : taste) {
            String code = t.getCode() == null ? null : t.getCode().toLowerCase(Locale.ROOT);
            TriggerGroup g = code == null ? null : groups.get(code);
            if (g == null || !candidates.containsKey(code) || t.getWeight() <= 0) continue;
            (g.ambient() ? back : front).add(new Share(code, t.getWeight()));
        }
        if (front.isEmpty() && back.isEmpty()) return null;
        if (front.isEmpty()) return new TonightPlan(Source.TASTE, null, top(back, 2), List.of());
        List<Share> layer = top(back, 1);
        if (layer.isEmpty()) {
            layer = STARTER_LAYER.stream().filter(candidates::containsKey).limit(1).map(c -> new Share(c, 1)).toList();
        }
        return new TonightPlan(Source.TASTE, null, top(front, 3), layer);
    }

    /** 기본: 있는 앞소리 두 가지 + 배경 하나 (없으면 있는 것 아무거나) */
    TonightPlan starter(Map<String, List<Block>> candidates) {
        List<Share> main = STARTER_MAIN.stream().filter(candidates::containsKey).limit(2).map(c -> new Share(c, 1)).toList();
        List<Share> layer = STARTER_LAYER.stream().filter(candidates::containsKey).limit(1).map(c -> new Share(c, 1)).toList();
        if (main.isEmpty()) {
            main = candidates.keySet().stream().limit(2).map(c -> new Share(c, 1)).toList();
            layer = List.of();
        }
        return new TonightPlan(Source.STARTER, null, main, layer);
    }

    private static List<Share> top(List<Share> shares, int n) {
        return shares.stream().sorted((a, b) -> Double.compare(b.weight(), a.weight())).limit(n).toList();
    }

    // ---------------------------------------------------------------- 묶음·후보

    /** 보이는 트리거 묶음 (대분류) + 소분류 이름, 정렬 순서대로 */
    private Map<String, TriggerGroup> groups() {
        List<SoundCategory> all = categoryMapper.findAllCategories();
        Map<Long, List<SoundCategory>> children = all.stream().filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(SoundCategory::getParentId));
        Map<String, TriggerGroup> out = new LinkedHashMap<>();
        for (SoundCategory c : all) {
            if (c.getParentId() != null || c.getCode() == null || c.getCode().isBlank()) continue;
            String code = c.getCode().trim().toLowerCase(Locale.ROOT);
            List<String> subs = children.getOrDefault(c.getId(), List.of()).stream()
                    .map(s -> s.getNameEn() != null && !s.getNameEn().isBlank() ? s.getName() + " " + s.getNameEn() : s.getName())
                    .toList();
            out.put(code, new TriggerGroup(code, c.getName(), c.getNameEn(), subs, TriggerGroup.AMBIENT.contains(code)));
        }
        return out;
    }

    /** 묶음 코드 → 쓸 블록 (내 것 먼저 받아서 섞음, 묶음마다 3개까지) */
    private Map<String, List<Block>> candidates(Long userId, Set<String> codes) {
        Map<String, List<Block>> out = new LinkedHashMap<>();
        if (codes.isEmpty()) return out;
        for (Block b : tonightMapper.candidates(userId, codes, CANDIDATES_PER_GROUP)) {
            String code = groupCode(b);
            if (code != null) out.computeIfAbsent(code, k -> new ArrayList<>()).add(b);
        }
        out.replaceAll((code, blocks) -> {
            List<Block> shuffled = new ArrayList<>(blocks);
            Collections.shuffle(shuffled, random);
            return List.copyOf(shuffled.subList(0, Math.min(USE_PER_GROUP, shuffled.size())));
        });
        return out;
    }

    private static String groupCode(Block b) {
        if (b.getCategory() == null) return null;
        String code = b.getCategory().getParentCode() != null ? b.getCategory().getParentCode() : b.getCategory().getCode();
        return code == null ? null : code.toLowerCase(Locale.ROOT);
    }

    // ---------------------------------------------------------------- 글

    /** 한 줄 다듬기: 줄바꿈·조종 문자를 빼고 공백 하나로, 80자까지 (비면 null) */
    static String clean(String prompt) {
        if (prompt == null) return null;
        String s = prompt.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        if (s.isEmpty()) return null;
        return s.length() > TonightDtos.MAX_PROMPT ? s.substring(0, TonightDtos.MAX_PROMPT) : s;
    }

    private static List<TriggerShare> shares(List<Share> shares, Map<String, TriggerGroup> groups) {
        List<Integer> percents = TonightBuilder.percents(shares);
        List<TriggerShare> out = new ArrayList<>();
        for (int i = 0; i < shares.size(); i++) {
            TriggerGroup g = groups.get(shares.get(i).code());
            String name = g == null ? shares.get(i).code() : Lang.pick(g.name(), g.nameEn());
            out.add(new TriggerShare(shares.get(i).code(), name, percents.get(i)));
        }
        return out;
    }

    /** 규칙 이름: "오늘 밤 · 탭핑, 바스락 + 빗소리" (영어 화면이면 "Tonight · Tapping, Crinkles + Rain") */
    static String ruleTitle(List<TriggerShare> main, List<TriggerShare> layer) {
        String names = main.stream().limit(2).map(s -> TriggerGroup.shortName(s.name()))
                .filter(Objects::nonNull).collect(Collectors.joining(", "));
        if (!layer.isEmpty()) names += " + " + TriggerGroup.shortName(layer.getFirst().name());
        return Messages.tr("오늘 밤 · " + names);
    }
}
