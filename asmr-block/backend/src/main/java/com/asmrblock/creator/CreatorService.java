package com.asmrblock.creator;

import com.asmrblock.common.ApiException;
import com.asmrblock.creator.CreatorDtos.CreatorResponse;
import com.asmrblock.creator.CreatorDtos.MyStatsResponse;
import com.asmrblock.i18n.Lang;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** 크리에이터 페이지 (@닉네임을 누르면): 그 사람이 올린 블록을 모아 보는 곳 */
@Service
@RequiredArgsConstructor
public class CreatorService {

    private final CreatorMapper creatorMapper;

    @Transactional(readOnly = true)
    public CreatorResponse get(Long userId) {
        CreatorStats s = creatorMapper.findStats(userId).orElseThrow(() -> ApiException.notFound("크리에이터를 찾을 수 없어요."));
        List<CreatorTrigger> top = creatorMapper.topTriggers(userId);
        return new CreatorResponse(s.getId(), s.getNickname(), s.getBlockCount(), s.getCollectorCount(), s.getPlayCount(),
                top.stream().map(t -> Lang.pick(t.getName(), t.getNameEn())).toList(), s.getCreatedAt(),
                top.stream().map(CreatorTrigger::getCode).toList());
    }

    /** 판매 화면 "내 블록 통계": 합계 + 최근 14일 (올린 블록이 없어도 0으로) */
    @Transactional(readOnly = true)
    public MyStatsResponse myStats(Long userId) {
        CreatorDtos.Totals t = creatorMapper.myTotals(userId);
        List<CreatorDtos.Day> days = creatorMapper.myDays(userId);
        return new MyStatsResponse(t.listedBlocks(), t.pendingBlocks(), t.collectors(), t.usedInCombos(),
                days.stream().mapToLong(CreatorDtos.Day::collects).sum(),
                days.stream().mapToLong(CreatorDtos.Day::plays).sum(), days);
    }
}
