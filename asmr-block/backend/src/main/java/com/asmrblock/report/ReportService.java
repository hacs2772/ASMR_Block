package com.asmrblock.report;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockMapper;
import com.asmrblock.block.BlockService;
import com.asmrblock.block.BlockStatus;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.RateLimiter;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistMapper;
import com.asmrblock.report.ReportDtos.Action;
import com.asmrblock.report.ReportDtos.Reason;
import com.asmrblock.report.ReportDtos.ReportRequest;
import com.asmrblock.report.ReportDtos.ReportTargetResponse;
import com.asmrblock.report.ReportDtos.ResolveRequest;
import com.asmrblock.report.ReportDtos.TargetType;
import com.asmrblock.storage.StorageService;
import com.asmrblock.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 신고하기 + 관리자 처리. 누구나(로그인 없이도) 블록·공개 조합·사람을 신고하고, 관리자는 대상별로 묶어 보고
 * 숨기기(블록 = 돌려보냄, 조합 = 숨김, 사람 = 업로드 막기) / 문제없음 / 되돌리기. 숨기면서 올린 사람 업로드도 막을 수 있음
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    static final int LIMIT = 10;
    static final Duration WINDOW = Duration.ofHours(1);
    private static final Set<String> STATUSES = Set.of("OPEN", "HIDDEN", "DISMISSED");

    private final ReportMapper reportMapper;
    private final RateLimiter rateLimiter;
    private final BlockMapper blockMapper;
    private final BlockService blockService;
    private final PlaylistMapper playlistMapper;
    private final UserMapper userMapper;
    private final StorageService storageService;

    /** 신고 (같은 사람이 같은 대상을 처리 전에 또 신고하면 한 번만 셈). 새로 받았으면 true */
    @Transactional
    public boolean report(Long userId, String clientIp, ReportRequest request) {
        rateLimiter.check("report:" + (userId != null ? "u" + userId : "ip" + clientIp), LIMIT, WINDOW,
                "신고를 너무 자주 보냈어요. 잠시 후 다시 해 주세요.");
        TargetType type = request.targetType();
        Long id = request.targetId();
        switch (type) {
            case BLOCK -> blockMapper.findById(id).orElseThrow(() -> ApiException.notFound("신고할 블록을 찾을 수 없어요."));
            case PLAYLIST -> playlistMapper.findById(id).filter(p -> p.isViewableBy(userId))
                    .orElseThrow(() -> ApiException.notFound("신고할 조합을 찾을 수 없어요."));
            case USER -> userMapper.findById(id).orElseThrow(() -> ApiException.notFound("신고할 사람을 찾을 수 없어요."));
        }
        if (userId != null && reportMapper.existsOpen(type.name(), id, userId)) {
            return false;
        }
        String detail = request.detail() == null || request.detail().isBlank() ? null : request.detail().trim();
        reportMapper.insert(type.name(), id, request.reason().name(), detail, userId, "OPEN");
        return true;
    }

    /** 관리자: 상태별(OPEN 새 신고 / HIDDEN 숨긴 것 / DISMISSED 문제없음) 대상 목록 */
    @Transactional(readOnly = true)
    public List<ReportTargetResponse> targets(String status) {
        String s = status == null ? "OPEN" : status.toUpperCase();
        if (!STATUSES.contains(s)) {
            throw ApiException.badRequest("status는 OPEN, HIDDEN, DISMISSED 중 하나예요.");
        }
        return reportMapper.findTargets(s).stream().map(t -> {
            Map<Reason, Long> reasons = new EnumMap<>(Reason.class);
            reasons.put(Reason.COPYRIGHT, t.getCopyright());
            reasons.put(Reason.OFFENSIVE, t.getOffensive());
            reasons.put(Reason.SPAM, t.getSpam());
            reasons.put(Reason.OTHER, t.getOther());
            String details = t.getDetails() == null ? null
                    : t.getDetails().length() > 400 ? t.getDetails().substring(0, 400) + "…" : t.getDetails();
            return new ReportTargetResponse(TargetType.valueOf(t.getTargetType()), t.getTargetId(), t.getTitle(),
                    t.getOwnerId(), t.getOwnerNickname(), t.getCount(), reasons, details, t.getState(),
                    storageService.publicUrl(t.getMediaKey()),
                    t.getFirstAt(), t.getLastAt());
        }).toList();
    }

    /** 관리자: 숨기기 / 문제없음 / 되돌리기 */
    @Transactional
    public String resolve(ResolveRequest request) {
        TargetType type = request.targetType();
        Long id = request.targetId();
        Long owner = ownerOf(type, id);
        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        return switch (request.action()) {
            case HIDE -> {
                hide(type, id, note);
                if (reportMapper.updateStatus(type.name(), id, "OPEN", "HIDDEN") == 0) {
                    // 신고 없이 관리자가 바로 숨긴 것도 "숨긴 것"에 보이게
                    reportMapper.insert(type.name(), id, Reason.OTHER.name(), note == null ? "관리자가 숨김" : note, null, "HIDDEN"); // i18n-ok (관리자 기록)
                }
                if (Boolean.TRUE.equals(request.banOwner()) && type != TargetType.USER && owner != null) {
                    userMapper.updateUploadBanned(owner, true);
                    reportMapper.insert(TargetType.USER.name(), owner, Reason.OTHER.name(),
                            "신고된 " + (type == TargetType.BLOCK ? "블록" : "조합") + " #" + id + "로 업로드 막음", null, "HIDDEN"); // i18n-ok (관리자 기록)
                }
                yield Boolean.TRUE.equals(request.banOwner()) && type != TargetType.USER ? "숨기고, 올린 사람의 업로드도 막았어요." : "숨겼어요.";
            }
            case DISMISS -> {
                reportMapper.updateStatus(type.name(), id, "OPEN", "DISMISSED");
                yield "문제없음으로 처리했어요.";
            }
            case RESTORE -> {
                restore(type, id);
                reportMapper.updateStatus(type.name(), id, "HIDDEN", "DISMISSED");
                yield "되돌렸어요.";
            }
        };
    }

    private void hide(TargetType type, Long id, String note) {
        switch (type) {
            case BLOCK -> {
                String reason = "신고로 내려졌어요" + (note == null ? "" : ": " + note);
                blockService.updateStatus(id, BlockStatus.REJECTED, reason.length() > 200 ? reason.substring(0, 200) : reason);
            }
            case PLAYLIST -> playlistMapper.updateHidden(id, true);
            case USER -> userMapper.updateUploadBanned(id, true);
        }
    }

    private void restore(TargetType type, Long id) {
        switch (type) {
            case BLOCK -> blockService.updateStatus(id, BlockStatus.APPROVED, null);
            case PLAYLIST -> playlistMapper.updateHidden(id, false);
            case USER -> userMapper.updateUploadBanned(id, false);
        }
    }

    /** 대상을 올린(만든) 사람. 대상이 없으면 404 */
    private Long ownerOf(TargetType type, Long id) {
        return switch (type) {
            case BLOCK -> blockMapper.findById(id).map(Block::getUploaderId)
                    .orElseThrow(() -> ApiException.notFound("블록을 찾을 수 없어요."));
            case PLAYLIST -> playlistMapper.findById(id).map(Playlist::getUserId)
                    .orElseThrow(() -> ApiException.notFound("조합을 찾을 수 없어요."));
            case USER -> userMapper.findById(id).map(u -> u.getId())
                    .orElseThrow(() -> ApiException.notFound("사람을 찾을 수 없어요."));
        };
    }
}
