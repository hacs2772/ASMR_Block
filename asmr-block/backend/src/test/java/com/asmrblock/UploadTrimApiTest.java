package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.storage.StorageService;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 올리기 전 구간 고르기: 소리를 먼저 올려 파형·길이를 받고, 고른 구간만 블록으로 */
class UploadTrimApiTest extends IntegrationTest {

    @Autowired
    private StorageService storageService;

    private ResultActions draft(String token, byte[] audio, String filename) throws Exception {
        return mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                .file(new MockMultipartFile("file", filename, "audio/mpeg", audio)), token));
    }

    private ResultActions uploadDraft(String token, String draftId, Double start, Double end) throws Exception {
        var request = bearer(multipart("/api/v1/blocks"), token)
                .param("draftId", draftId)
                .param("title", "고른 구간")
                .param("categoryId", String.valueOf(leafCategoryId()))
                .param("license", "OWN");
        if (start != null) {
            request.param("trimStart", String.valueOf(start));
        }
        if (end != null) {
            request.param("trimEnd", String.valueOf(end));
        }
        return mvc.perform(request);
    }

    @Test
    @DisplayName("먼저 올리면 길이(소수점)와 파형 400칸: 조용한 앞부분은 낮고 소리 나는 뒷부분은 높다")
    void draftWaveform() throws Exception {
        String token = newUser().accessToken();
        String body = json(draft(token, TestAudio.silenceThenToneMp3(10, 10), "long.mp3")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.draftId").isString())
                .andExpect(jsonPath("$.data.duration", closeTo(20.0, 0.3)))
                .andExpect(jsonPath("$.data.peaks", hasSize(400))));
        List<Double> peaks = JsonPath.read(body, "$.data.peaks[*]");
        double quiet = peaks.subList(20, 180).stream().mapToDouble(Double::doubleValue).max().orElseThrow();
        double loud = peaks.subList(220, 380).stream().mapToDouble(Double::doubleValue).min().orElseThrow();
        assertThat(quiet).isLessThan(0.05);
        assertThat(loud).isGreaterThan(0.8);
        assertThat(peaks.stream().mapToDouble(Double::doubleValue).max().orElseThrow()).isEqualTo(1.0);

        // 소리가 아닌 파일, 로그인 안 함
        draft(token, "hello".getBytes(), "note.txt").andExpect(status().isBadRequest());
        draft(token, "not audio".getBytes(), "fake.mp3").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("오디오 파일을 읽을 수 없습니다. 다른 파일로 시도해주세요."));
        mvc.perform(multipart("/api/v1/blocks/upload-drafts")
                .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", TestAudio.sineMp3(12, 400))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("먼저 올린 파일 + 구간 → 그 부분만 블록. 한 번 쓴 파일·남의 파일은 다시 못 씀")
    void uploadTrimmedDraft() throws Exception {
        String token = newUser().accessToken();
        String draftId = JsonPath.read(json(draft(token, TestAudio.sineMp3(40, 520), "rec.m4a.mp3")), "$.data.draftId");

        // 남의 파일은 못 씀
        uploadDraft(newUser().accessToken(), draftId, 5.0, 17.0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("올린 소리 파일을 찾지 못했어요. 파일을 다시 골라 주세요."));

        uploadDraft(token, draftId, 5.0, 17.0)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.duration").value(12));
        // 한 번 쓰면 지워짐
        uploadDraft(token, draftId, 5.0, 17.0).andExpect(status().isBadRequest());

        // 구간 없이 먼저 올린 파일 그대로 → 전체 길이. 끝을 파일보다 길게 적으면 파일 끝까지
        String whole = JsonPath.read(json(draft(token, TestAudio.sineMp3(15, 300), "whole.mp3")), "$.data.draftId");
        uploadDraft(token, whole, null, null).andExpect(status().isCreated()).andExpect(jsonPath("$.data.duration").value(15));
        String overEnd = JsonPath.read(json(draft(token, TestAudio.sineMp3(30, 300), "over.mp3")), "$.data.draftId");
        uploadDraft(token, overEnd, 12.0, 99.0).andExpect(status().isCreated()).andExpect(jsonPath("$.data.duration").value(18));
    }

    @Test
    @DisplayName("파일을 바로 올려도 구간을 고를 수 있고, 잘못 고른 구간은 알려 준다")
    void trimRules() throws Exception {
        String token = newUser().accessToken();
        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "direct.mp3", "audio/mpeg", TestAudio.sineMp3(30, 640))), token)
                        .param("title", "바로 자르기").param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN")
                        .param("trimStart", "0").param("trimEnd", "10.4"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.duration").value(10));

        String draftId = JsonPath.read(json(draft(token, TestAudio.sineMp3(30, 700), "rules.mp3")), "$.data.draftId");
        uploadDraft(token, draftId, 3.0, null).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("구간은 시작과 끝을 같이 골라 주세요."));
        uploadDraft(token, draftId, 9.0, 4.0).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("구간의 시작이 끝보다 앞이어야 해요."));
        uploadDraft(token, draftId, 2.0, 8.0).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("고른 구간은 10초 ~ 20분 사이여야 해요."));
        // 파일 끝을 넘겨서 실제로는 10초가 안 되는 구간
        uploadDraft(token, draftId, 25.0, 40.0).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("고른 구간이 파일보다 길어요. 구간을 다시 골라 주세요."));
        // 잘못 골라서 실패한 뒤에도 같은 파일로 다시 올릴 수 있음
        uploadDraft(token, draftId, 10.0, 25.0).andExpect(status().isCreated()).andExpect(jsonPath("$.data.duration").value(15));

        // 소리는 하나에서만: 파일 + draftId, 소리 파일 + 영상은 안 됨 (싱크가 어긋날 수 있어서)
        String one = "소리 파일이나 영상 중 하나만 올려 주세요. 영상이면 영상의 소리를 그대로 써요.";
        String another = JsonPath.read(json(draft(token, TestAudio.sineMp3(12, 300), "a.mp3")), "$.data.draftId");
        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "b.mp3", "audio/mpeg", TestAudio.sineMp3(12, 300))), token)
                        .param("draftId", another)
                        .param("title", "둘 다").param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value(one));
        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "b.mp3", "audio/mpeg", TestAudio.sineMp3(12, 300)))
                        .file(new MockMultipartFile("video", "v.mp4", "video/mp4", TestAudio.testVideo(12, true))), token)
                        .param("title", "따로따로").param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value(one));
    }

    @Test
    @DisplayName("영상: 먼저 올려 파형을 받고, 고른 구간으로 소리와 화면을 같이 자름 (길이가 같아 싱크가 맞음)")
    void videoDraftTrimsSoundAndPicture() throws Exception {
        String token = newUser().accessToken();
        String body = json(mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                        .file(new MockMultipartFile("file", "scene.mp4", "video/mp4", TestAudio.testVideo(30, true))), token)
                        .param("kind", "video"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.kind").value("video"))
                .andExpect(jsonPath("$.data.duration", closeTo(30.0, 0.3)))
                .andExpect(jsonPath("$.data.peaks", hasSize(400))));
        String draftId = JsonPath.read(body, "$.data.draftId");

        long id = idOf(uploadDraft(token, draftId, 6.0, 18.0)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.duration").value(12))
                .andExpect(jsonPath("$.data.design.hasVideo").value(true)));
        // 저장된 영상도 같은 12초
        String mine = json(getWithToken("/api/v1/me/uploads", token));
        List<String> urls = JsonPath.read(mine, "$.data.content[?(@.id == " + id + ")].design.videoUrl");
        String videoUrl = urls.getFirst();
        assertThat(videoUrl).contains("/videos/");
        Path videoFile = storageService.resolve(videoUrl.substring(videoUrl.indexOf("videos/")));
        assertThat(TestAudio.durationOf(videoFile)).isCloseTo(12.0, org.assertj.core.data.Offset.offset(0.3));

        // 영상을 바로 올려도 구간을 고를 수 있음
        mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("video", "v.mp4", "video/mp4", TestAudio.testVideo(14, true))), token)
                        .param("title", "바로 자른 영상").param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN")
                        .param("trimStart", "2").param("trimEnd", "13"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.duration").value(11));

        // 소리 없는 영상, 영상이 아닌 파일
        mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                        .file(new MockMultipartFile("file", "silent.mp4", "video/mp4", TestAudio.testVideo(12, false))), token)
                        .param("kind", "video"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("영상에서 소리를 찾지 못했어요. 소리가 있는 영상을 골라 주세요."));
        mvc.perform(bearer(multipart("/api/v1/blocks/upload-drafts")
                        .file(new MockMultipartFile("file", "a.mp3", "audio/mpeg", TestAudio.sineMp3(12, 300))), token)
                        .param("kind", "video"))
                .andExpect(status().isBadRequest());
    }
}
