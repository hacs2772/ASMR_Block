package com.asmrblock.report;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ReportMapper {

    void insert(@Param("targetType") String targetType, @Param("targetId") Long targetId, @Param("reason") String reason,
                @Param("detail") String detail, @Param("reporterId") Long reporterId, @Param("status") String status);

    /** 같은 사람이 같은 대상을 아직 처리 안 된 채로 신고했는지 */
    boolean existsOpen(@Param("targetType") String targetType, @Param("targetId") Long targetId, @Param("reporterId") Long reporterId);

    /** status별 신고를 대상마다 묶어서 (최근 순, 100개까지) */
    List<ReportTarget> findTargets(@Param("status") String status);

    /** 그 대상의 from 상태 신고를 to로 */
    int updateStatus(@Param("targetType") String targetType, @Param("targetId") Long targetId,
                     @Param("from") String from, @Param("to") String to);
}
