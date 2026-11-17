package com.asmrblock.tonight;

import com.asmrblock.block.Block;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface TonightMapper {

    /** 묶음마다 perGroup개까지: 내 블록함에 있는 것 먼저, 그다음 상점의 무료 블록 (많이 들은 순) */
    List<Block> candidates(@Param("userId") Long userId, @Param("codes") Collection<String> codes,
                           @Param("perGroup") int perGroup);

    void insert(@Param("userId") Long userId, @Param("feature") String feature, @Param("model") String model,
                @Param("inputTokens") long inputTokens, @Param("outputTokens") long outputTokens,
                @Param("ok") boolean ok, @Param("error") String error);

    int countTodayByUser(@Param("userId") Long userId);

    int countToday();

    AiUsageSummary summary();
}
