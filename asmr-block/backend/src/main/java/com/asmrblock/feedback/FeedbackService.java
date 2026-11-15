package com.asmrblock.feedback;

import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.feedback.FeedbackDtos.FeedbackRequest;
import com.asmrblock.feedback.FeedbackDtos.FeedbackResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** 의견 보내기: 로그인 없이도 받음. 같은 사람(계정 또는 IP)이 너무 자주 보내면 잠깐 막음 */
@Service
@RequiredArgsConstructor
public class FeedbackService {

    static final int LIMIT = 5;                         // WINDOW 동안 최대 5번
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final FeedbackMapper feedbackMapper;
    private final Map<String, Deque<Instant>> recent = new ConcurrentHashMap<>();

    @Transactional
    public void create(Long userId, String clientIp, FeedbackRequest request) {
        checkRate(userId != null ? "u" + userId : "ip" + clientIp);
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

    private void checkRate(String key) {
        Instant now = Instant.now();
        Deque<Instant> times = recent.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(WINDOW))) {
                times.pollFirst();
            }
            if (times.size() >= LIMIT) {
                throw ApiException.tooManyRequests("의견을 너무 자주 보냈어요. 잠시 후 다시 보내 주세요.");
            }
            times.addLast(now);
        }
        if (recent.size() > 10_000) { // 오래된 기록 정리 (메모리 보호)
            recent.entrySet().removeIf(e -> e.getValue().isEmpty() || e.getValue().peekLast().isBefore(now.minus(WINDOW)));
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
