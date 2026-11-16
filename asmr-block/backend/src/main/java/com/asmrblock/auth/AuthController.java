package com.asmrblock.auth;

import com.asmrblock.common.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import com.asmrblock.auth.AuthDtos.BetaLoginResponse;
import com.asmrblock.auth.AuthDtos.BetaStatus;
import com.asmrblock.auth.AuthDtos.LoginRequest;
import com.asmrblock.auth.AuthDtos.LoginResponse;
import com.asmrblock.auth.AuthDtos.RefreshTokenRequest;
import com.asmrblock.auth.AuthDtos.SignupRequest;
import com.asmrblock.auth.AuthDtos.TokenResponse;
import com.asmrblock.common.ApiResponse;
import com.asmrblock.user.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest http) {
        return ApiResponse.ok("회원가입이 완료되었습니다.", UserResponse.from(authService.signup(request, ClientIp.of(http))));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return ApiResponse.ok("로그인 성공", authService.login(request, ClientIp.of(http)));
    }

    // 베타 기간에만: "베타로 바로 시작" 버튼을 보여줄지
    @GetMapping("/beta")
    public ApiResponse<BetaStatus> betaStatus() {
        return ApiResponse.ok(authService.betaStatus());
    }

    // 베타 기간에만: 가입 없이 손님 계정을 만들어 바로 로그인 (정식 출시 때 app.beta.quick-login=false)
    @PostMapping("/beta-login")
    public ApiResponse<BetaLoginResponse> betaLogin(HttpServletRequest http, @RequestParam(required = false) String lang) {
        return ApiResponse.ok("베타 손님으로 시작했어요.", authService.betaLogin(ClientIp.of(http), lang));
    }

    // 토큰 갱신 (refreshToken도 새로 바뀜 - 둘 다 저장할 것)
    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()));
    }

    // 로그아웃 (서버에서 refreshToken 폐기)
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());
        return ApiResponse.message("로그아웃 되었습니다.");
    }
}
