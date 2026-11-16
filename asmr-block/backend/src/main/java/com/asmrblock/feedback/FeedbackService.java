package com.asmrblock.feedback;

import com.asmrblock.common.RateLimiter;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.feedback.FeedbackDtos.FeedbackRequest;
import com.asmrblock.feedback.FeedbackDtos.FeedbackResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/** 의견 보내기: 로그인 없이도 받음. 같은 사람(계정 또는 IP)이 너무 자주 보내면 잠깐 막음 */
@Service
@RequiredArgsConstructor
public class FeedbackService {

    static final int LIMIT = 5;                         // WINDOW 동안 최대 5번
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final FeedbackMapper feedbackMapper;
    private final RateLimiter rateLimiter;

    @Transactional
    public void create(Long userId, String clientIp, FeedbackRequest request) {
        rateLimiter.check("feedback:" + (userId != null ? "u" + userId : "ip" + clientIp), LIMIT, WINDOW,
                "의견을 너무 자주 보냈어요. 잠시 후 다시 보내 주세요.");
        String contact = blankToNull(request.contact());
        feedbackMapper.insert(Feedback.builder()
                .userId(userId)
                .message(request.message().trim())
                .contact(contact)
                .page(blankToNull(request.page()))
                .client(blankToNull(request.client()) == null ? "web" : request.client())
                .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<FeedbackResponse> list(Boolean done, PageQuery page) {
        return PageResponse.of(feedbackMapper.findAll(done, page.offset(), page.size()).stream()
                .map(FeedbackResponse::from).toList(), page, feedbackMapper.count(done));
    }

    @Transactional
    public FeedbackResponse markDone(Long id, boolean done) {
        if (feedbackMapper.findById(id) == null) {
            throw ApiException.notFound("의견을 찾을 수 없어요.");
        }
        feedbackMapper.updateDone(id, done);
        return FeedbackResponse.from(feedbackMapper.findById(id));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
