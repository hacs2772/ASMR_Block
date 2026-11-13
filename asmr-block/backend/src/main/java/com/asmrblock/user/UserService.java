package com.asmrblock.user;

import com.asmrblock.auth.RefreshTokenService;
import com.asmrblock.common.ApiException;
import com.asmrblock.playlist.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final RefreshTokenService refreshTokenService;
    private final PlaylistService playlistService;

    @Transactional(readOnly = true)
    public User getActiveUser(Long userId) {
        return userMapper.findById(userId)
                .orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
    }

    @Transactional
    public User update(Long userId, UserUpdateRequest request) {
        User user = getActiveUser(userId);
        if (request.nickname() != null) {
            user.setNickname(request.nickname());
        }
        if (request.profileImage() != null) {
            user.setProfileImage(request.profileImage());
        }
        if (request.language() != null) {
            user.setLanguage(request.language());
        }
        userMapper.update(user);
        return getActiveUser(userId);
    }

    /**
     * 회원 탈퇴 (앱스토어 심사 필수 기능).
     * 내 플레이리스트 삭제 → 로그인 토큰 전부 폐기 → 개인정보 익명화.
     */
    @Transactional
    public void delete(Long userId) {
        getActiveUser(userId);
        playlistService.deleteAllOf(userId);
        refreshTokenService.revokeAll(userId);
        userMapper.anonymize(userId);
    }
}
