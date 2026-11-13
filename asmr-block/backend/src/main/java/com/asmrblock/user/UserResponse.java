package com.asmrblock.user;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String email,
        String nickname,
        String profileImage,
        String language,
        Role role,
        LocalDateTime createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getNickname(),
                user.getProfileImage(), user.getLanguage(), user.getRole(), user.getCreatedAt());
    }
}
