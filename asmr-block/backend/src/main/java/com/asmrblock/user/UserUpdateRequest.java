package com.asmrblock.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 바꿀 값만 보내면 됩니다 (null은 그대로 유지) */
public record UserUpdateRequest(
        @Size(min = 2, max = 20, message = "닉네임은 2~20자여야 합니다.")
        String nickname,

        @Size(max = 500, message = "프로필 이미지 주소가 너무 깁니다.")
        String profileImage,

        @Pattern(regexp = "ko|en|ja|zh", message = "언어는 ko, en, ja, zh 중 하나여야 합니다.")
        String language) {
}
