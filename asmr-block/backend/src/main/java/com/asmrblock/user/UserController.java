package com.asmrblock.user;

import com.asmrblock.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ApiResponse<UserResponse> getMe(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(UserResponse.from(userService.getActiveUser(userId)));
    }

    @PutMapping
    public ApiResponse<UserResponse> updateMe(@AuthenticationPrincipal Long userId,
                                              @Valid @RequestBody UserUpdateRequest request) {
        return ApiResponse.ok("정보가 수정되었습니다.", UserResponse.from(userService.update(userId, request)));
    }

    // 회원 탈퇴
    @DeleteMapping
    public ApiResponse<Void> deleteMe(@AuthenticationPrincipal Long userId) {
        userService.delete(userId);
        return ApiResponse.message("탈퇴 처리되었습니다.");
    }
}
