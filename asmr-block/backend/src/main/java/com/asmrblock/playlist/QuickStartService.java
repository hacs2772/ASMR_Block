package com.asmrblock.playlist;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockMapper;
import com.asmrblock.block.BlockSearchCondition;
import com.asmrblock.block.BlockStatus;
import com.asmrblock.category.CategoryDtos.CategoryTreeResponse;
import com.asmrblock.category.CategoryService;
import com.asmrblock.common.ApiException;
import com.asmrblock.library.LibraryService;
import com.asmrblock.playlist.PlaylistDtos.ItemRequest;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSaveRequest;
import com.asmrblock.playlist.PlaylistDtos.QuickStartRequest;
import com.asmrblock.playlist.PlaylistDtos.TrackRequest;
import com.asmrblock.render.RenderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 첫 조합 바로 만들기 ("어떤 소리에 팅글이 오세요?" → 바로 듣기).
 * 고른 트리거마다 많이 들은 무료 블록을 2개까지 내 블록함에 담고, 돌아가며 이어 붙여 15분 안팎 한 바퀴를 만든 뒤
 * (비공개, 기본 60분 반복) 완성본 만들기까지 바로 시작 → 앱·웹은 듣기 화면으로 가면 됨.
 * 블록 편집 없이 처음 온 사람이 바로 "내 조합"을 들어 보게 하는 것 (관리자 통계 "어디서 그만두나요"의 조합 단계)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuickStartService {

    static final int TARGET_SECONDS = 15 * 60;
    static final int MAX_ITEMS = 8;
    static final int PER_TRIGGER = 2;
    static final int DEFAULT_LISTEN_MINUTES = 60;

    private final CategoryService categoryService;
    private final BlockMapper blockMapper;
    private final LibraryService libraryService;
    private final PlaylistService playlistService;
    private final RenderService renderService;

    public Playlist start(Long userId, QuickStartRequest request) {
        Map<String, CategoryTreeResponse> groups = categoryService.getCategoryTree().stream()
                .filter(g -> g.code() != null)
                .collect(Collectors.toMap(g -> g.code().toLowerCase(Locale.ROOT), Function.identity(), (a, b) -> a));
        List<CategoryTreeResponse> picked = new ArrayList<>();
        for (String code : new LinkedHashSet<>(request.triggers().stream().map(c -> c.trim().toLowerCase(Locale.ROOT)).toList())) {
            CategoryTreeResponse group = groups.get(code);
            if (group == null) {
                throw ApiException.badRequest("모르는 트리거예요: " + code);
            }
            picked.add(group);
        }

        // 트리거마다 무료 블록 (많이 들은 순, 상점에 보이는 것만)
        List<List<Block>> perTrigger = new ArrayList<>();
        List<String> names = new ArrayList<>();
        for (CategoryTreeResponse group : picked) {
            List<Block> blocks = blockMapper.search(BlockSearchCondition.builder()
                    .categoryId(group.id()).free(true).status(BlockStatus.APPROVED).listedOnly(true)
                    .sort("popular").offset(0).limit(PER_TRIGGER).build());
            if (!blocks.isEmpty()) {
                perTrigger.add(blocks);
                names.add(group.name());
            }
        }
        if (perTrigger.isEmpty()) {
            throw ApiException.badRequest("고른 트리거에 아직 무료 블록이 없어요. 다른 트리거를 골라 주세요.");
        }
        List<Block> picks = roundRobin(perTrigger);
        libraryService.addFree(userId, picks.stream().map(Block::getId).toList());

        String title = request.title() != null && !request.title().isBlank()
                ? request.title().trim() : ("나의 첫 팅글 · " + String.join("·", names)); // i18n-ok (저장되는 조합 이름 — 영어 화면은 영어 이름을 보냄)
        if (title.length() > 100) {
            title = title.substring(0, 100);
        }
        int listen = request.listenMinutes() == null ? DEFAULT_LISTEN_MINUTES : request.listenMinutes();
        Playlist playlist = playlistService.create(userId, new PlaylistSaveRequest(
                title, null, false, new TrackRequest(1.0, sequence(perTrigger)), null, listen));
        try {
            renderService.request(playlist.getId(), userId);
        } catch (RuntimeException e) {
            // 완성본은 듣기 화면이 다시 요청함
            log.warn("첫 조합 완성본 요청 실패: {}", e.getMessage());
        }
        return playlist;
    }

    /** 트리거마다 첫째 블록 → 둘째 블록 순으로 (같은 트리거가 연달아 나오지 않게) */
    static List<Block> roundRobin(List<List<Block>> perTrigger) {
        List<Block> out = new ArrayList<>();
        for (int i = 0; i < PER_TRIGGER; i++) {
            for (List<Block> blocks : perTrigger) {
                if (i < blocks.size()) {
                    out.add(blocks.get(i));
                }
            }
        }
        return out;
    }

    /**
     * 트리거를 돌아가며 이어 붙여 15분 안팎: 트리거 A·B면 A1 B1 A2 B1 A1 … (같은 트리거가 연달아 나오지 않음).
     * 블록이 하나뿐이면 반복으로
     */
    static List<ItemRequest> sequence(List<List<Block>> perTrigger) {
        if (perTrigger.size() == 1 && perTrigger.getFirst().size() == 1) {
            Block only = perTrigger.getFirst().getFirst();
            int repeat = (int) Math.min(PlaylistDtos.MAX_REPEAT, Math.max(1, Math.ceil(TARGET_SECONDS / (double) Math.max(1, only.getDuration()))));
            return List.of(new ItemRequest(only.getId(), repeat, null));
        }
        List<ItemRequest> items = new ArrayList<>();
        int total = 0;
        int triggers = perTrigger.size();
        for (int i = 0; total < TARGET_SECONDS && items.size() < MAX_ITEMS; i++) {
            List<Block> blocks = perTrigger.get(i % triggers);
            Block b = blocks.get((i / triggers) % blocks.size());
            items.add(new ItemRequest(b.getId(), 1, null));
            total += b.getDuration();
        }
        return items;
    }
}
