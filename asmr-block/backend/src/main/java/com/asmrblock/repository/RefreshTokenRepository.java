package com.asmrblock.repository;

import com.asmrblock.domain.RefreshToken;
import org.apache.ibatis.annotations.Mapper;

import java.util.Optional;

@Mapper
public interface RefreshTokenRepository {

    void insert(RefreshToken refreshToken);

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // 사용 처리 (한 번 쓴 토큰은 폐기하고 새로 발급)
    void revoke(Long id);

    // 해당 사용자의 모든 토큰 폐기 (탈취 의심 시)
    void revokeAllByUserId(Long userId);
}
