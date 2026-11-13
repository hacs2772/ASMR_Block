package com.asmrblock.service;

import com.asmrblock.config.AppProperties;
import com.asmrblock.domain.RefreshToken;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Refresh Token = 추측 불가능한 랜덤 문자열 (DB에는 해시만 저장).
 * - 한 번 사용하면 폐기하고 새 토큰을 발급 (rotation)
 * - 이미 폐기된 토큰이 다시 들어오면 탈취로 보고 그 사용자의 토큰을 전부 폐기
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final AppProperties properties;

    @Transactional
    public String issue(Long userId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        refreshTokenRepository.insert(RefreshToken.builder()
                .userId(userId)
                .tokenHash(hash(rawToken))
                .expiresAt(LocalDateTime.now().plus(properties.auth().refreshTokenValidity()))
                .build());
        return rawToken;
    }

    /** 토큰을 확인하고 폐기합니다. 성공하면 사용자 ID를 돌려줍니다. */
    @Transactional(noRollbackFor = CustomException.class)
    public Long consume(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> CustomException.unauthorized("유효하지 않은 토큰입니다. 다시 로그인해주세요."));

        if (token.isRevoked()) {
            log.warn("폐기된 Refresh Token 재사용 감지 - userId={} 의 모든 토큰을 폐기합니다.", token.getUserId());
            refreshTokenRepository.revokeAllByUserId(token.getUserId());
            throw CustomException.unauthorized("유효하지 않은 토큰입니다. 다시 로그인해주세요.");
        }
        if (token.isExpired(LocalDateTime.now())) {
            throw CustomException.unauthorized("로그인이 만료되었습니다. 다시 로그인해주세요.");
        }

        refreshTokenRepository.revoke(token.getId());
        return token.getUserId();
    }

    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> refreshTokenRepository.revoke(token.getId()));
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
