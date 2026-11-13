package com.asmrblock.render;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface RenderMapper {

    Optional<AudioRender> findByHash(String hash);

    /** 이미 있으면 아무것도 안 함 */
    void insertIfAbsent(@Param("hash") String hash, @Param("json") String compositionJson);

    /** PENDING → PROCESSING (다른 작업자가 먼저 가져갔으면 0 반환) */
    int markProcessing(String hash);

    void markDone(@Param("hash") String hash, @Param("fileKey") String fileKey, @Param("duration") int duration);

    void markFailed(@Param("hash") String hash, @Param("errorMessage") String errorMessage);

    /** FAILED/DONE(파일 유실) → PENDING 으로 되돌려 다시 만들게 함 */
    void resetToPending(String hash);

    /** 서버 재시작 시: 만들다 멈춘 작업을 다시 대기열로 */
    int resetProcessingToPending();

    List<String> findPendingHashes();
}
