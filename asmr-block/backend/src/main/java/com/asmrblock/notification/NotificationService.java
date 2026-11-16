package com.asmrblock.notification;

import com.asmrblock.block.Block;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.i18n.Lang;
import com.asmrblock.i18n.Messages;
import com.asmrblock.notification.NotificationDtos.NotificationResponse;
import com.asmrblock.notification.NotificationDtos.NotificationSummary;
import com.asmrblock.notification.NotificationDtos.Settings;
import com.asmrblock.notification.NotificationDtos.Target;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.user.User;
import com.asmrblock.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;

/**
 * 알림함: 크리에이터에게 검수 결과(승인·돌려보냄)와 담김 소식(내 블록·조합을 담음).
 * 받는 사람이 그 종류를 꺼 두었으면 아예 만들지 않음. 담김 소식은 읽기 전까지 한 줄로 묶음. 90일 지난 알림은 매일 지움
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    static final int KEEP_DAYS = 90;

    private final NotificationMapper notificationMapper;
    private final UserMapper userMapper;

    // ---------- 만들기 (다른 기능에서 부름) ----------

    /** 관리자가 블록을 승인·돌려보냄 (같은 상태로 다시 바꾸면 부르지 않음) */
    @Transactional
    public void blockReviewed(Block block, boolean approved, String note) {
        if (block.getUploaderId() == null || !wants(block.getUploaderId(), NotificationType.BLOCK_APPROVED)) {
            return;
        }
        Notification n = new Notification();
        n.setUserId(block.getUploaderId());
        n.setType(approved ? NotificationType.BLOCK_APPROVED : NotificationType.BLOCK_REJECTED);
        n.setBlockId(block.getId());
        n.setTitle(cut(block.getTitle(), 200));
        n.setNote(approved ? null : cut(note, 300));
        notificationMapper.insert(n);
    }

    /** 다른 사람이 내 블록을 블록함에 담음 (상점의 "블록 담기"로 새로 담았을 때만) */
    @Transactional
    public void blockCollected(Block block, Long collectorId) {
        Long owner = block.getUploaderId();
        if (owner == null || Objects.equals(owner, collectorId)) {
            return;
        }
        collected(owner, NotificationType.BLOCK_COLLECTED, block.getId(), null, block.getTitle(), collectorId);
    }

    /** 다른 사람이 내 공개 조합을 한 번에 담아 감 */
    @Transactional
    public void comboCollected(Playlist source, Long collectorId) {
        Long owner = source.getUserId();
        if (owner == null || Objects.equals(owner, collectorId)) {
            return;
        }
        collected(owner, NotificationType.COMBO_COLLECTED, null, source.getId(), source.getTitle(), collectorId);
    }

    private void collected(Long owner, NotificationType type, Long blockId, Long playlistId, String title, Long collectorId) {
        if (!wants(owner, type)) {
            return;
        }
        String actor = userMapper.findById(collectorId).map(User::getNickname).orElse(null);
        String t = cut(title, 200);
        if (notificationMapper.bumpUnread(owner, type, blockId, playlistId, actor, t) > 0) {
            return;
        }
        Notification n = new Notification();
        n.setUserId(owner);
        n.setType(type);
        n.setBlockId(blockId);
        n.setPlaylistId(playlistId);
        n.setTitle(t);
        n.setActorNickname(actor);
        notificationMapper.insert(n);
    }

    private boolean wants(Long userId, NotificationType type) {
        NotifySettings s = notificationMapper.findSettings(userId);
        return s != null && (type.isReview() ? s.isNotifyReview() : s.isNotifyCollect());
    }

    // ---------- 내 알림함 ----------

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(Long userId, PageQuery page) {
        List<NotificationResponse> items = notificationMapper.findByUser(userId, page.offset(), page.size()).stream()
                .map(NotificationService::toResponse).toList();
        return PageResponse.of(items, page, notificationMapper.countByUser(userId));
    }

    @Transactional(readOnly = true)
    public NotificationSummary summary(Long userId) {
        return new NotificationSummary(notificationMapper.countUnread(userId), settings(userId));
    }

    /** 읽음 표시 (ids가 비었으면 전부) */
    @Transactional
    public NotificationSummary markRead(Long userId, List<Long> ids) {
        notificationMapper.markRead(userId, ids == null || ids.isEmpty() ? null : ids);
        return summary(userId);
    }

    @Transactional
    public NotificationSummary updateSettings(Long userId, Settings settings) {
        settings(userId); // 없는 사람이면 404
        notificationMapper.updateSettings(userId, settings.review(), settings.collect());
        return summary(userId);
    }

    private Settings settings(Long userId) {
        NotifySettings s = notificationMapper.findSettings(userId);
        if (s == null) {
            throw ApiException.notFound("사용자를 찾을 수 없어요.");
        }
        return new Settings(s.isNotifyReview(), s.isNotifyCollect());
    }

    /** 오래된 알림 정리 (매일 새벽 4시 50분, 한국 시간) */
    @Scheduled(cron = "0 50 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void purgeOld() {
        int deleted = notificationMapper.deleteOlderThanDays(KEEP_DAYS);
        if (deleted > 0) {
            log.info("{}일 지난 알림 {}개를 지웠어요", KEEP_DAYS, deleted);
        }
    }

    static NotificationResponse toResponse(Notification n) {
        String title = "‘" + n.getTitle() + "’";
        String actor = n.getActorNickname() == null ? null : "@" + n.getActorNickname() + "님";
        String people = n.getCount() > 1
                ? (actor == null ? n.getCount() + "명이" : actor + " 외 " + (n.getCount() - 1) + "명이")
                : (actor == null ? "누군가" : actor + "이");
        String message = Lang.english() ? englishMessage(n, title) : switch (n.getType()) {
            case BLOCK_APPROVED -> title + " 블록이 승인돼서 블록 상점에 올라갔어요";
            case BLOCK_REJECTED -> title + " 블록을 돌려보냈어요";
            case BLOCK_COLLECTED -> people + " " + title + " 블록을 담았어요";
            case COMBO_COLLECTED -> people + " " + title + " 조합을 담아 갔어요";
        };
        Target target = switch (n.getType()) {
            case BLOCK_APPROVED, BLOCK_COLLECTED -> n.getBlockId() == null ? new Target("UPLOADS", null) : new Target("BLOCK", n.getBlockId());
            case BLOCK_REJECTED -> new Target("UPLOADS", n.getBlockId());
            case COMBO_COLLECTED -> n.getPlaylistId() == null ? null : new Target("COMBO", n.getPlaylistId());
        };
        // 돌려보낸 이유도 서버가 적은 문장("신고로 내려졌어요: …")이면 영어로
        return new NotificationResponse(n.getId(), n.getType(), message, Messages.tr(n.getNote()), target, n.isRead(),
                n.getUpdatedAt() == null ? null : n.getUpdatedAt().atOffset(ZoneOffset.UTC),
                n.getTitle(), n.getActorNickname(), Math.max(1, n.getCount()));
    }

    /** 영어 알림 문장 (웹·앱 사전 notif.msg.*와 같음) */
    static String englishMessage(Notification n, String title) {
        String actor = n.getActorNickname() == null ? null : "@" + n.getActorNickname();
        int others = Math.max(0, n.getCount() - 1);
        String people = actor == null ? "Someone" : others > 0 ? actor + " and " + others + (others == 1 ? " other" : " others") : actor;
        return switch (n.getType()) {
            case BLOCK_APPROVED -> title + " was approved and is now in the Block Shop";
            case BLOCK_REJECTED -> title + " was sent back";
            case BLOCK_COLLECTED -> people + " added your block " + title;
            case COMBO_COLLECTED -> people + " saved your combo " + title;
        };
    }

    private static String cut(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() > max ? value.substring(0, max) : value;
    }
}
