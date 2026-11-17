package com.asmrblock.creator;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Optional;

@Mapper
public interface CreatorMapper {

    /** 활성 사용자의 숫자 (상점에 보이는 승인 블록 기준). 없는 사람이면 비어 있음 */
    Optional<CreatorStats> findStats(Long userId);

    /** 많이 올린 트리거 묶음 이름 (많은 순, 최대 3개) */
    List<CreatorTrigger> topTriggers(Long userId);

    /** 판매 화면 통계: 합계 */
    CreatorDtos.Totals myTotals(Long userId);

    /** 판매 화면 통계: 최근 14일 하루하루 */
    List<CreatorDtos.Day> myDays(Long userId);
}
