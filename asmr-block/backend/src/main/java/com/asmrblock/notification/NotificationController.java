package com.asmrblock.notification;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.notification.NotificationDtos.NotificationResponse;
import com.asmrblock.notification.NotificationDtos.NotificationSummary;
import com.asmrblock.notification.NotificationDtos.ReadRequest;
import com.asmrblock.notification.NotificationDtos.Settings;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 내 알림함 (로그인 필요) */
@RestController
@RequestMapping("/api/v1/me/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<PageResponse<NotificationResponse>> list(@AuthenticationPrincipal Long userId,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "30") int size) {
        return ApiResponse.ok(notificationService.list(userId, PageQuery.of(page, size)));
    }

    /** 종 아이콘: 안 읽은 수 + 알림 설정 */
    @GetMapping("/summary")
    public ApiResponse<NotificationSummary> summary(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(notificationService.summary(userId));
    }

    @PostMapping("/read")
    public ApiResponse<NotificationSummary> read(@AuthenticationPrincipal Long userId, @Valid @RequestBody(required = false) ReadRequest request) {
        return ApiResponse.ok(notificationService.markRead(userId, request == null ? null : request.ids()));
    }

    @PutMapping("/settings")
    public ApiResponse<NotificationSummary> settings(@AuthenticationPrincipal Long userId, @Valid @RequestBody Settings settings) {
        NotificationSummary summary = notificationService.updateSettings(userId, settings);
        boolean off = !settings.review() && !settings.collect();
        return ApiResponse.ok(off ? "알림을 모두 껐어요." : "알림 설정을 바꿨어요.", summary);
    }
}
