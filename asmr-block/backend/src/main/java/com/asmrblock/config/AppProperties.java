package com.asmrblock.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.util.List;

/**
 * application.yml 의 app.* 설정값.
 * 값이 잘못되면 서버가 시작 단계에서 바로 멈추고 이유를 알려줍니다.
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Auth auth,
        @Valid @NotNull Storage storage,
        @Valid @NotNull Cors cors,
        @Valid @NotNull PlayCount playCount,
        @Valid @NotNull Audio audio,
        @Valid @NotNull Render render) {

    public record Jwt(
            @NotBlank(message = "JWT 비밀키가 없습니다. JWT_SECRET 환경변수를 설정하세요.")
            @Size(min = 32, message = "JWT 비밀키는 32자 이상이어야 합니다.")
            String secret,
            @NotNull Duration accessTokenValidity) {
    }

    public record Auth(@NotNull Duration refreshTokenValidity) {
    }

    /** publicBaseUrl이 비어 있으면 요청 주소 기준으로 파일 URL을 만듦 (휴대폰 개발용) */
    public record Storage(@NotBlank String localDir, String publicBaseUrl) {
    }

    public record Cors(List<String> allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        }
    }

    public record PlayCount(@NotNull Duration dedupeWindow) {
    }

    /** ffmpeg 위치와 오디오 처리 기준 */
    public record Audio(
            @NotBlank String ffmpegPath,
            @NotBlank String ffprobePath,
            double targetLufs,
            @NotNull Duration processTimeout) {
    }

    /** 완성본(합친 파일) 만들기 설정 */
    public record Render(
            @Min(1) int maxConcurrent,
            @DecimalMin("0.0") double crossfadeSeconds,
            @DecimalMin("0.0") double fadeSeconds) {
    }
}
