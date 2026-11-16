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
        @Valid @NotNull Render render,
        @Valid @NotNull Shop shop,
        @Valid @NotNull Beta beta,
        @Valid @NotNull Admin admin,
        @Valid @NotNull Upload upload,
        @Valid @NotNull Site site,
        @Valid @NotNull Limits limits,
        @Valid @NotNull Cleanup cleanup) {

    public record Jwt(
            @NotBlank(message = "JWT 비밀키가 없습니다. JWT_SECRET 환경변수를 설정하세요.") // i18n-ok (켤 때 설정 검사)
            @Size(min = 32, message = "JWT 비밀키는 32자 이상이어야 합니다.") // i18n-ok (켤 때 설정 검사)
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

    /** 블록 상점: 판매자가 정할 수 있는 최대 가격(코인). 너무 비싸지지 않게 */
    public record Shop(@Min(0) int sellerMaxPrice) {
    }

    /**
     * 베타 기간 설정. quickLogin: "베타로 바로 시작"(가입 없이 손님 계정). 정식 출시 때 반드시 false!
     * starterBlocks: 손님 계정에 처음부터 담아 주는 무료 블록 수 (인기순)
     */
    public record Beta(boolean quickLogin, @Min(0) int starterBlocks) {
    }

    /**
     * 관리자 계정 (공개용 public 모드): 이메일·비밀번호가 있으면 서버가 켜질 때 이 계정을 만들거나 비밀번호를 맞춤.
     * 개발용 테스트 계정(password123) 대신 나만 아는 비밀번호로. 비우면 아무것도 안 함
     */
    public record Admin(String email, String password) {
        public boolean configured() {
            return email != null && !email.isBlank() && password != null && !password.isBlank();
        }
    }

    /**
     * 사이트 주소 (공유 링크 미리보기의 그림·주소용, 예: https://asmrblock.com). 비우면 요청이 들어온 주소 기준
     */
    public record Site(String url) {
        public boolean configured() {
            return url != null && !url.isBlank();
        }
    }

    /**
     * 너무 자주 하면 잠깐 막기 (공개 사이트라 장난으로 계정·파일을 마구 만드는 걸 막음). 관리자는 업로드 제한 없음.
     * betaLoginPerHourPerIp·signupPerHourPerIp = 같은 접속 주소에서 1시간에, betaLoginPerDay = 사이트 전체 하루에,
     * uploadDraftsPerHour = 한 사람이 1시간에 먼저 올리기(구간 고르기), uploadsPerDay = 한 사람이 하루에 블록 올리기
     */
    public record Limits(@Min(1) int betaLoginPerHourPerIp, @Min(1) int betaLoginPerDay, @Min(1) int signupPerHourPerIp,
                         @Min(1) int uploadDraftsPerHour, @Min(1) int uploadsPerDay,
                         @Min(1) int loginFailsPerEmail, @Min(1) int loginFailsPerIp) {
    }

    /** 정리: 아무도 renderKeepDays일 동안 안 들은 완성본 파일을 지움 (다시 들으면 저절로 다시 만듦). cron = 한국 시간 */
    public record Cleanup(@Min(1) int renderKeepDays, @NotBlank String cron) {
    }

    /** 업로드 제한. 공개용은 Cloudflare 무료 요금제가 한 번에 100MB까지만 받아서 영상은 그보다 작게 */
    public record Upload(@Min(1) int maxVideoMb) {
    }

    /** 완성본(합친 파일) 만들기 설정 */
    public record Render(
            @Min(1) int maxConcurrent,
            @DecimalMin("0.0") double crossfadeSeconds,
            @DecimalMin("0.0") double fadeSeconds) {
    }
}
