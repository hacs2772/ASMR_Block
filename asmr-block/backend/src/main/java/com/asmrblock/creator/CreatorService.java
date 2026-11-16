package com.asmrblock.creator;

import com.asmrblock.common.ApiException;
import com.asmrblock.creator.CreatorDtos.CreatorResponse;
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
                top.stream().map(CreatorTrigger::getName).toList(), s.getCreatedAt(),
                top.stream().map(CreatorTrigger::getCode).toList());
    }
}
