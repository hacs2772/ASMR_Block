package com.asmrblock.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
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
        @Valid @NotNull Coins coins,
        @Valid @NotNull Beta beta,
        @Valid @NotNull Admin admin,
        @Valid @NotNull Upload upload,
        @Valid @NotNull Site site,
        @Valid @NotNull Limits limits,
        @Valid @NotNull Cleanup cleanup,
        @Valid @NotNull Ai ai) {

    public record Jwt(
            @NotBlank(message = "JWT 비밀키가 없습니다. JWT_SECRET 환경변수를 설정하세요.") // i18n-ok (켤 때 설정 검사)
            @Size(min = 32, message = "JWT 비밀키는 32자 이상이어야 합니다.") // i18n-ok (켤 때 설정 검사)
            String secret,
            @NotNull Duration accessTokenValidity) {
    }

    public record Auth(@NotNull Duration refreshTokenValidity) {
    }

    /**
     * 파일 저장소. type = local(이 PC 디스크 localDir) · s3(클라우드, s3.*).
     * publicBaseUrl이 비어 있으면 요청 주소 기준으로 파일 URL을 만듦 (휴대폰 개발용, local일 때)
     */
    public record Storage(@NotBlank String localDir, String publicBaseUrl, String type, @Valid S3 s3) {
        public Storage {
            type = type == null || type.isBlank() ? "local" : type.trim().toLowerCase();
            s3 = s3 == null ? new S3(null, null, null, null, null, null, null, 3) : s3;
        }

        /** 클라우드(S3 호환) 저장소를 쓰는지 */
        public boolean cloud() {
            return "s3".equals(type);
        }

        /**
         * 클라우드 저장소 (Cloudflare R2 등 S3 호환). endpoint·bucket·accessKey·secretKey·publicBaseUrl은 type=s3일 때 꼭 필요.
         * cacheDir = ffmpeg가 읽을 파일을 잠깐 받아 두는 곳, cacheKeepDays일 동안 안 쓰면 지움
         */
        public record S3(String endpoint, String region, String bucket, String accessKey, String secretKey,
                         String publicBaseUrl, String cacheDir, @Min(1) int cacheKeepDays) {
            public S3 {
                region = region == null || region.isBlank() ? "auto" : region.trim();
                cacheDir = cacheDir == null || cacheDir.isBlank() ? "./media-cache" : cacheDir;
            }
        }
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
     * 코인: creatorSharePercent = 충전 코인으로 팔린 블록에서 크리에이터 몫(%), krwPerCoin = 1코인이 몇 원(정산 금액),
     * grantMax = 관리자가 한 번에 주거나 회수할 수 있는 최대 코인
     */
    public record Coins(@Min(0) @Max(100) int creatorSharePercent, @Min(1) int krwPerCoin, @Min(1) int grantMax) {
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

    /**
     * AI 조합 ("오늘 밤 조합"의 "한 줄로 말하면 쌓아 줘요", Claude API). apiKey가 비면 AI를 부르지 않고 규칙으로만 쌓음.
     * model = 부를 모델(기본 claude-haiku-5-5, 가장 싸고 빠름), effort = 생각 정도(low, 비우면 안 보냄), baseUrl = 테스트용(비우면 Anthropic),
     * dailyPerUser·dailyTotal = 한 사람·사이트 전체가 하루(한국 시간)에 AI를 부르는 횟수 (넘으면 AI 없이 낱말로 찾음),
     * tonightPerHour = 한 사람이 1시간에 오늘 밤 조합을 만드는 횟수 (넘으면 429),
     * priceInputPerMtok·priceOutputPerMtok = 100만 토큰당 달러 (관리자 통계의 "대략 얼마"), krwPerUsd = 1달러가 몇 원인지 (대략)
     */
    public record Ai(String apiKey, @NotBlank String model, String effort, String baseUrl, @NotNull Duration timeout,
                     @Min(0) int dailyPerUser, @Min(0) int dailyTotal, @Min(1) int tonightPerHour,
                     @DecimalMin("0.0") double priceInputPerMtok, @DecimalMin("0.0") double priceOutputPerMtok,
                     @Min(1) int krwPerUsd) {
        public boolean enabled() {
            return apiKey != null && !apiKey.isBlank() && dailyPerUser > 0 && dailyTotal > 0;
        }
    }

    /** 완성본(합친 파일) 만들기 설정 */
    public record Render(
            @Min(1) int maxConcurrent,
            @DecimalMin("0.0") double crossfadeSeconds,
            @DecimalMin("0.0") double fadeSeconds) {
    }
}
