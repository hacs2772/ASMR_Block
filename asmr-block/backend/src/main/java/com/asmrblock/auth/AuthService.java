package com.asmrblock.auth;

import com.asmrblock.auth.AuthDtos.BetaLoginResponse;
import com.asmrblock.auth.AuthDtos.BetaStatus;
import com.asmrblock.auth.AuthDtos.LoginRequest;
import com.asmrblock.auth.AuthDtos.LoginResponse;
import com.asmrblock.auth.AuthDtos.SignupRequest;
import com.asmrblock.auth.AuthDtos.TokenResponse;
import com.asmrblock.block.Block;
import com.asmrblock.block.BlockMapper;
import com.asmrblock.block.BlockSearchCondition;
import com.asmrblock.block.BlockStatus;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.RateLimiter;
import com.asmrblock.config.AppProperties;
import com.asmrblock.library.LibraryService;
import com.asmrblock.security.JwtTokenProvider;
import com.asmrblock.user.Role;
import com.asmrblock.user.User;
import com.asmrblock.user.UserMapper;
import com.asmrblock.user.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final AppProperties properties;
    private final BlockMapper blockMapper;
    private final LibraryService libraryService;
    private final RateLimiter rateLimiter;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public User signup(SignupRequest request, String clientIp) {
        rateLimiter.check("signup:" + clientIp, properties.limits().signupPerHourPerIp(), Duration.ofHours(1),
                "가입이 너무 많이 몰렸어요. 잠시 후 다시 시도해 주세요.");
        return signup(request);
    }

    public User signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (userMapper.existsByEmail(email)) {
            throw ApiException.conflict("이미 사용 중인 이메일입니다.");
        }
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .language(request.language() != null ? request.language() : "ko")
                .role(Role.USER)
                .isActive(true)
                .build();
        userMapper.insert(user);
        return userMapper.findById(user.getId()).orElseThrow();
    }

    static final Duration LOGIN_FAIL_WINDOW = Duration.ofMinutes(15);
    static final String LOGIN_LOCKED = "비밀번호를 여러 번 틀려서 잠깐 막았어요. 15분 뒤에 다시 해 주세요.";

    @Transactional
    public LoginResponse login(LoginRequest request) {
        return login(request, null);
    }

    /** 로그인. 15분 동안 같은 이메일·같은 접속 주소로 너무 많이 틀리면 429 (비밀번호 마구 넣어 보기 막기) */
    @Transactional
    public LoginResponse login(LoginRequest request, String clientIp) {
        String email = normalizeEmail(request.email());
        String emailKey = "login-fail:email:" + email;
        String ipKey = "login-fail:ip:" + clientIp;
        rateLimiter.ensureUnder(emailKey, properties.limits().loginFailsPerEmail(), LOGIN_FAIL_WINDOW, LOGIN_LOCKED);
        if (clientIp != null) {
            rateLimiter.ensureUnder(ipKey, properties.limits().loginFailsPerIp(), LOGIN_FAIL_WINDOW, LOGIN_LOCKED);
        }
        User user = userMapper.findByEmail(email)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPassword()))
                .orElse(null);
        if (user == null) {
            rateLimiter.record(emailKey);
            if (clientIp != null) {
                rateLimiter.record(ipKey);
            }
            throw ApiException.unauthorized("이메일 또는 비밀번호가 일치하지 않습니다.");
        }
        rateLimiter.clear(emailKey);

        return new LoginResponse(
                jwtTokenProvider.createAccessToken(user.getId(), user.getRole().name()),
                refreshTokenService.issue(user.getId()),
                UserResponse.from(user));
    }

    public BetaStatus betaStatus() {
        return new BetaStatus(properties.beta().quickLogin());
    }

    /**
     * 베타 손님 계정 만들기 + 로그인. 바로 조합을 만들어 볼 수 있게 인기 무료 블록을 몇 개 담아 줌.
     * 정식 출시 때는 app.beta.quick-login=false 로 끄면 404
     */
    public BetaLoginResponse betaLogin(String clientIp) {
        return betaLogin(clientIp, null);
    }

    /** lang = 화면 언어 (en이면 손님 이름도 영어 "Guest1234", 계정 언어도 en) */
    @Transactional
    public BetaLoginResponse betaLogin(String clientIp, String lang) {
        boolean english = "en".equals(lang);
        if (!properties.beta().quickLogin()) {
            throw ApiException.notFound("베타 로그인은 끝났어요. 회원가입 후 이용해 주세요.");
        }
        // 같은 곳에서 너무 많이 / 사이트 전체로 하루에 너무 많이 → 잠깐 막음 (장난으로 손님 계정을 마구 만드는 것 방지)
        rateLimiter.check("beta:" + clientIp, properties.limits().betaLoginPerHourPerIp(), Duration.ofHours(1),
                "베타 손님 만들기가 잠깐 몰렸어요. 조금 뒤에 다시 눌러 주세요.");
        rateLimiter.check("beta:all", properties.limits().betaLoginPerDay(), Duration.ofDays(1),
                "오늘 베타 손님 자리가 다 찼어요. 회원가입으로 시작하거나 내일 다시 와 주세요.");
        String email = "beta-" + randomText(10).toLowerCase(Locale.ROOT) + "@beta.asmrblock.com";
        String password = randomText(20);
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname((english ? "Guest" : "베타손님") + (1000 + random.nextInt(9000)))
                .language(english ? "en" : "ko")
                .role(Role.USER)
                .isActive(true)
                .build();
        userMapper.insert(user);

        int starter = properties.beta().starterBlocks();
        if (starter > 0) {
            List<Long> freeBlocks = blockMapper.search(BlockSearchCondition.builder()
                    .free(true).status(BlockStatus.APPROVED).listedOnly(true).sort("popular").offset(0).limit(starter).build())
                    .stream().map(Block::getId).toList();
            libraryService.addFree(user.getId(), freeBlocks);
        }
        User saved = userMapper.findById(user.getId()).orElseThrow();
        return new BetaLoginResponse(
                jwtTokenProvider.createAccessToken(saved.getId(), saved.getRole().name()),
                refreshTokenService.issue(saved.getId()),
                UserResponse.from(saved), email, password);
    }

    /** 영문 대소문자 + 숫자 */
    private String randomText(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    // 토큰 갱신 (Refresh Token도 새로 발급)
    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse refresh(String refreshToken) {
        Long userId = refreshTokenService.consume(refreshToken);
        User user = userMapper.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("사용할 수 없는 계정입니다."));
        return new TokenResponse(
                jwtTokenProvider.createAccessToken(user.getId(), user.getRole().name()),
                refreshTokenService.issue(user.getId()));
    }

    // 로그아웃 (Refresh Token 폐기 - Access Token은 짧게(30분) 살아있다가 만료됨)
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
