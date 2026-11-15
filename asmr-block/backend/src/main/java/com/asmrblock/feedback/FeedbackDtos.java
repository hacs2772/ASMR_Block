package com.asmrblock.feedback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class FeedbackDtos {

    private FeedbackDtos() {
    }

    /** 의견 보내기. contact: 답장 받을 이메일 등 (선택), page: 보낸 화면, client: web / app */
    public record FeedbackRequest(
            @NotBlank(message = "의견을 적어 주세요.")
            @Size(min = 2, max = 2000, message = "의견은 2~2000자로 적어 주세요.")
            String message,

            @Size(max = 100, message = "연락처는 100자 이내로 적어 주세요.")
            String contact,

            @Size(max = 200)
            String page,

            @Pattern(regexp = "^(web|app)?$", message = "client는 web 또는 app이에요.")
            String client) {
    }

    /**
     * 관리자: 의견 목록. who = 보낸 사람 (닉네임, 로그인 안 했으면 null), beta = 베타 손님 계정인지
     */
    public record FeedbackResponse(Long id, String message, String contact, String page, String client,
                                   String who, boolean beta, boolean done, LocalDateTime createdAt) {
        public static FeedbackResponse from(Feedback f) {
            boolean beta = f.getEmail() != null && f.getEmail().endsWith("@beta.asmrblock.com");
            return new FeedbackResponse(f.getId(), f.getMessage(), f.getContact(), f.getPage(), f.getClient(),
                    f.getNickname(), beta, Boolean.TRUE.equals(f.getIsDone()), f.getCreatedAt());
        }
    }

    /** 관리자: 확인함 표시 */
    public record FeedbackDoneRequest(@NotNull(message = "done은 필수예요.") Boolean done) {
    }
}
