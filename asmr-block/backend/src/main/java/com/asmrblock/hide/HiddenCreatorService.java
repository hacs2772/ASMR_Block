package com.asmrblock.hide;

import com.asmrblock.common.ApiException;
import com.asmrblock.hide.HideDtos.HiddenCreatorResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 크리에이터 숨기기 (사용자 차단): 숨긴 사람의 블록·공개 조합은 나에게 상점·요즘 뜨는·추천·추천 조합·
 * 오늘 밤 조합·첫 조합에서 안 보임 (각 목록 쿼리가 user_hidden_creator로 거름). 이미 담은 블록·내 조합은 그대로
 */
@Service
@RequiredArgsConstructor
public class HiddenCreatorService {

    private final HiddenCreatorMapper mapper;

    @Transactional(readOnly = true)
    public List<HiddenCreatorResponse> list(Long userId) {
        return mapper.list(userId);
    }

    @Transactional(readOnly = true)
    public boolean isHidden(Long userId, Long creatorId) {
        return userId != null && mapper.exists(userId, creatorId);
    }

    /** 숨기기 (이미 숨겼으면 그대로). 나 자신은 400, 없는 사람은 404 */
    @Transactional
    public void hide(Long userId, Long creatorId) {
        if (userId.equals(creatorId)) {
            throw ApiException.badRequest("나 자신은 숨길 수 없어요.");
        }
        if (!mapper.isActiveUser(creatorId)) {
            throw ApiException.notFound("크리에이터를 찾을 수 없어요.");
        }
        mapper.insert(userId, creatorId);
    }

    /** 다시 보기 (숨기지 않았어도 그대로) */
    @Transactional
    public void unhide(Long userId, Long creatorId) {
        mapper.delete(userId, creatorId);
    }

    /** 탈퇴: 내가 숨긴 목록을 지움 (users 줄은 익명으로 남아서 직접) */
    @Transactional
    public void deleteAllOf(Long userId) {
        mapper.deleteAllOf(userId);
    }
}
