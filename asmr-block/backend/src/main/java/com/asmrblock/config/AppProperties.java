package com.asmrblock.config;

import jakarta.validation.Valid;
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
        @Valid @NotNull PlayCount playCount) {

    public record Jwt(
            @NotBlank(message = "JWT 비밀키가 없습니다. JWT_SECRET 환경변수를 설정하세요.")
            @Size(min = 32, message = "JWT 비밀키는 32자 이상이어야 합니다.")
            String secret,
            @NotNull Duration accessTokenValidity) {
    }

    public record Auth(@NotNull Duration refreshTokenValidity) {
    }

    public record Storage(@NotBlank String localDir, @NotBlank String publicBaseUrl) {
    }

    public record Cors(List<String> allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        }
    }

    public record PlayCount(@NotNull Duration dedupeWindow) {
    }
}
