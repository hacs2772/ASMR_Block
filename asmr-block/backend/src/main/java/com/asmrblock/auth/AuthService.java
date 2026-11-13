package com.asmrblock.auth;

import com.asmrblock.auth.AuthDtos.LoginRequest;
import com.asmrblock.auth.AuthDtos.LoginResponse;
import com.asmrblock.auth.AuthDtos.SignupRequest;
import com.asmrblock.auth.AuthDtos.TokenResponse;
import com.asmrblock.common.ApiException;
import com.asmrblock.security.JwtTokenProvider;
import com.asmrblock.user.Role;
import com.asmrblock.user.User;
import com.asmrblock.user.UserMapper;
import com.asmrblock.user.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public User signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (userMapper.existsByEmail(email)) {
            throw ApiException.conflict("이미 사용 중인 이메일입니다.");
        }
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .language("ko")
                .role(Role.USER)
                .isActive(true)
                .build();
        userMapper.insert(user);
        return userMapper.findById(user.getId()).orElseThrow();
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userMapper.findByEmail(normalizeEmail(request.email()))
                .filter(u -> passwordEncoder.matches(request.password(), u.getPassword()))
                .orElseThrow(() -> ApiException.unauthorized("이메일 또는 비밀번호가 일치하지 않습니다."));

        return new LoginResponse(
                jwtTokenProvider.createAccessToken(user.getId(), user.getRole().name()),
                refreshTokenService.issue(user.getId()),
                UserResponse.from(user));
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
