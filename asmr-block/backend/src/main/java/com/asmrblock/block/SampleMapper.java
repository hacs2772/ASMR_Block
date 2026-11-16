package com.asmrblock.block;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Map;

/** 공개용 샘플(로그인 불가 계정 "ASMR Block 샘플"의 블록·조합) 한꺼번에 보이기·숨기기 */
@Mapper
public interface SampleMapper {

    /** sample_blocks, listed_sample_blocks, sample_combos, public_sample_combos, real_blocks */
    Map<String, Object> status();

    int setBlocksListed(@Param("listed") boolean listed);

    int setCombosPublic(@Param("isPublic") boolean isPublic);
}
