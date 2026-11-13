package com.asmrblock.security;

import com.asmrblock.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

/**
 * Access Token(JWT) 발급/검증.
 * Refresh Token은 JWT가 아니라 DB에 저장하는 랜덤 문자열입니다 (RefreshTokenService 참고).
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_ROLE = "role";
    private static final String TYPE_ACCESS = "access";

    private final SecretKey key;
    private final long accessTokenValidityMillis;

    public JwtTokenProvider(AppProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenValidityMillis = properties.jwt().accessTokenValidity().toMillis();
    }

    public String createAccessToken(Long userId, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .claim(CLAIM_ROLE, role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenValidityMillis))
                .signWith(key)
                .compact();
    }

    /** 유효한 Access Token이면 사용자 정보를, 아니면(만료/위조/다른 종류 토큰) 빈 값을 돌려줍니다. */
    public Optional<AuthUser> parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            if (!TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class))) {
                return Optional.empty();
            }
            return Optional.of(new AuthUser(
                    Long.parseLong(claims.getSubject()),
                    claims.get(CLAIM_ROLE, String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("유효하지 않은 Access Token: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public record AuthUser(Long userId, String role) {
    }
}
