package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 영어판 3단계 = 서버 글: 요청 언어(Accept-Language · ?lang=)에 따라
 * 오류·안내 문장, 트리거·스티커 이름, 블록·조합 영어 제목, 공유 미리보기, 알림 문장이 영어로.
 * 아무것도 안 보내면 지금처럼 한국어, 관리자 화면은 언제나 한국어
 */
@SuppressWarnings("unchecked")
class EnglishApiTest extends IntegrationTest {

    private static final String EN = "en-US,en;q=0.9";

    @Test
    @DisplayName("오류 문장: 영어 요청이면 영어 (로그인 실패·입력 검사 여러 개·401), 그 밖은 한국어")
    void errorMessages() throws Exception {
        String wrong = "{\"email\":\"test@asmrblock.com\",\"password\":\"wrong-password\"}";
        mvc.perform(post("/api/v1/auth/login").header("Accept-Language", EN)
                        .contentType(MediaType.APPLICATION_JSON).content(wrong))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message").value("The email or password is incorrect."));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                .andExpect(jsonPath("$.error.message").value("이메일 또는 비밀번호가 일치하지 않습니다."));
        // 한국어 휴대폰(다른 언어도 섞인 목록)이면 한국어
        mvc.perform(post("/api/v1/auth/login").header("Accept-Language", "ko-KR,ko;q=0.9,en;q=0.8")
                        .contentType(MediaType.APPLICATION_JSON).content(wrong))
                .andExpect(jsonPath("$.error.message").value("이메일 또는 비밀번호가 일치하지 않습니다."));

        // 입력 검사 여러 개가 한 줄로 → 하나씩 영어로
        String body = json(mvc.perform(post("/api/v1/auth/signup").header("Accept-Language", "en")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()));
        String message = JsonPath.read(body, "$.error.message");
        assertThat(message).contains("Email is required.").contains("Password is required.").contains("Nickname is required.");
        assertThat(message).doesNotContainPattern("[가-힣]");

        // 로그인 없이 막힌 곳 (보안 필터가 답함)
        mvc.perform(get("/api/v1/me/notifications").header("Accept-Language", EN))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message").value("Please log in, or your session has expired."));
        // 주소의 ?lang=en도 (공유 링크·웹 미리보기)
        mvc.perform(get("/api/v1/playlists/999999?lang=en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message").value("Combo not found."));
    }

    @Test
    @DisplayName("트리거 이름·설명, 블록 제목·소개·녹음한 곳, 조합 제목이 영어로 (영어 제목으로도 찾아짐), 한국어는 그대로")
    void contentNames() throws Exception {
        mvc.perform(get("/api/v1/categories").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.code == 'tap')].name").value(hasItem("Tapping & Typing")))
                .andExpect(jsonPath("$.data[?(@.code == 'tap')].description").value(hasItem("Tapping, nails & glass, keyboards, clock clicks")));
        mvc.perform(get("/api/v1/categories"))
                .andExpect(jsonPath("$.data[?(@.code == 'tap')].name").value(hasItem("탭핑·타건")));

        mvc.perform(get("/api/v1/blocks/15").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data.title").value("Japanese crossing signal"))
                .andExpect(jsonPath("$.data.recordedPlace").value("Outside Shinjuku Station, Tokyo"))
                .andExpect(jsonPath("$.data.description").value(org.hamcrest.Matchers.startsWith("[Synthetic test audio]")));
        mvc.perform(get("/api/v1/blocks/15"))
                .andExpect(jsonPath("$.data.recordedPlace").value("도쿄 신주쿠역 앞"));
        // 블록 소분류 이름도 영어
        String block = json(mvc.perform(get("/api/v1/blocks/1").header("Accept-Language", EN)));
        assertThat((String) JsonPath.read(block, "$.data.title")).isEqualTo("Gentle rain");
        assertThat((String) JsonPath.read(block, "$.data.category.name")).doesNotContainPattern("[가-힣]");
        assertThat((String) JsonPath.read(block, "$.data.category.parentName")).doesNotContainPattern("[가-힣]");

        // 영어 제목으로 찾기
        mvc.perform(get("/api/v1/blocks?keyword=gentle rain").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data.content[*].id").value(hasItem(1)));

        // 조합: 상세·목록·블록 이름
        mvc.perform(get("/api/v1/playlists/1").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data.title").value("Rainy night work session"))
                .andExpect(jsonPath("$.data.main.items[0].title").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.matchesPattern(".*[가-힣].*"))));
        mvc.perform(get("/api/v1/playlists/public?size=50").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data.content[?(@.id == 1)].title").value(hasItem("Rainy night work session")));
        mvc.perform(get("/api/v1/playlists/1"))
                .andExpect(jsonPath("$.data.title").value(org.hamcrest.Matchers.matchesPattern(".*[가-힣].*")));
    }

    @Test
    @DisplayName("관리자: 화면은 늘 한국어 + 영어 이름 칸(nameEn). 영어 이름을 적으면 영어 메뉴에 바로, 비우면 한국어 이름으로")
    void adminEnglishNames() throws Exception {
        String admin = admin().accessToken();
        mvc.perform(bearer(get("/api/v1/admin/categories"), admin).header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.code == 'tap')].name").value(hasItem("탭핑·타건")))
                .andExpect(jsonPath("$.data[?(@.code == 'tap')].nameEn").value(hasItem("Tapping & Typing")));
        // 관리자 오류도 한국어
        mvc.perform(bearer(post("/api/v1/admin/categories"), admin).header("Accept-Language", EN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"색 없음\",\"icon\":\"star\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value(org.hamcrest.Matchers.matchesPattern(".*[가-힣].*")));

        String tree = json(postJson("/api/v1/admin/categories",
                "{\"name\":\"영어 테스트 묶음\",\"nameEn\":\"English test group\",\"color\":\"#224466\",\"icon\":\"star\","
                        + "\"description\":\"테스트\",\"descriptionEn\":\"For tests\"}", admin)
                .andExpect(status().isCreated()));
        List<Integer> ids = JsonPath.read(tree, "$.data[?(@.name == '영어 테스트 묶음')].id");
        long groupId = ids.get(0);
        assertThat((List<String>) JsonPath.read(tree, "$.data[?(@.id == " + groupId + ")].nameEn")).containsExactly("English test group");
        mvc.perform(get("/api/v1/categories").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.id == " + groupId + ")].name").value(hasItem("English test group")))
                .andExpect(jsonPath("$.data[?(@.id == " + groupId + ")].description").value(hasItem("For tests")));

        // 영어 이름 바꾸기 → 비우기
        patchJson("/api/v1/admin/categories/" + groupId, "{\"nameEn\":\"Renamed group\"}", admin).andExpect(status().isOk());
        mvc.perform(get("/api/v1/categories").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.id == " + groupId + ")].name").value(hasItem("Renamed group")));
        patchJson("/api/v1/admin/categories/" + groupId, "{\"nameEn\":\"\"}", admin).andExpect(status().isOk());
        mvc.perform(get("/api/v1/categories").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.id == " + groupId + ")].name").value(hasItem("영어 테스트 묶음")));
        // 다른 것(이름 등)만 바꾸면 영어 이름은 그대로
        patchJson("/api/v1/admin/categories/" + groupId, "{\"nameEn\":\"Kept\"}", admin).andExpect(status().isOk());
        patchJson("/api/v1/admin/categories/" + groupId, "{\"name\":\"영어 테스트 묶음2\"}", admin).andExpect(status().isOk());
        mvc.perform(get("/api/v1/categories").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.id == " + groupId + ")].name").value(hasItem("Kept")));
        patchJson("/api/v1/admin/categories/" + groupId, "{\"nameEn\":\"" + "x".repeat(31) + "\"}", admin)
                .andExpect(status().isBadRequest());

        // 스티커: 기본 스티커는 영어 이름이 있음, 새 스티커도 영어 이름을 함께
        mvc.perform(get("/api/v1/stickers").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.code == 'flagjp')].name").value(hasItem("Japan")));
        mvc.perform(get("/api/v1/stickers"))
                .andExpect(jsonPath("$.data[?(@.code == 'flagjp')].nameEn").value(hasItem("Japan")))
                .andExpect(jsonPath("$.data[?(@.code == 'flagjp')].name").value(hasItem(org.hamcrest.Matchers.matchesPattern(".*[가-힣].*"))));
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#FF85AF\"/></svg>";
        String created = json(mvc.perform(bearer(multipart("/api/v1/admin/stickers")
                        .file(new org.springframework.mock.web.MockMultipartFile("file", "moon.svg", "image/svg+xml", svg.getBytes(StandardCharsets.UTF_8))), admin)
                        .param("name", "보름달").param("nameEn", "Full moon"))
                .andExpect(status().isCreated()));
        String code = JsonPath.read(created, "$.data.code");
        assertThat((String) JsonPath.read(created, "$.data.nameEn")).isEqualTo("Full moon");
        mvc.perform(get("/api/v1/stickers").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.code == '" + code + "')].name").value(hasItem("Full moon")));
        patchJson("/api/v1/admin/stickers/" + code, "{\"nameEn\":\"\"}", admin).andExpect(status().isOk());
        mvc.perform(get("/api/v1/stickers").header("Accept-Language", EN))
                .andExpect(jsonPath("$.data[?(@.code == '" + code + "')].name").value(hasItem("보름달")));
    }

    @Test
    @DisplayName("공유 미리보기: ?lang=en이면 og 글·언어가 영어, 사람도 영어 화면(?lang=en)으로. 그냥 열면 한국어 그대로")
    void sharePreview() throws Exception {
        String html = mvc.perform(get("/s/1?lang=en")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(html).contains("<html lang=\"en\">")
                .contains("og:locale\" content=\"en_US\"")
                .contains("og:title\" content=\"Rainy night work session · ASMR Block\"")
                .contains(" min loop")
                .contains("url=http://localhost/listen/1?lang=en")
                .contains("Listen to the combo");
        String ko = mvc.perform(get("/s/1")).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(ko).contains("<html lang=\"ko\">").contains("og:locale\" content=\"ko_KR\"")
                .contains("한 바퀴").contains("url=http://localhost/listen/1\"").doesNotContain("lang=en");

        // 블록 공유: 트리거·말소리·녹음한 곳까지 영어
        String block = mvc.perform(get("/s/b/15?lang=en")).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(block).contains("Japanese crossing signal").contains("Outside Shinjuku Station, Tokyo").contains("?block=15&amp;lang=en");
        // 없는 조합 → 사이트 기본 카드도 영어
        String missing = mvc.perform(get("/s/999999?lang=en")).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(missing).contains("/og-image.png").doesNotContainPattern("og:(title|description)\" content=\"[^\"]*[가-힣]");
    }

    @Test
    @DisplayName("알림 문장·돌려보낸 이유(서버가 적은 것)가 영어로, 크리에이터가 쓴 블록 이름은 그대로")
    void notifications() throws Exception {
        String creator = newUser().accessToken();
        long block = uploadApprovedBlock(creator, 12, 640);
        collect(newUser().accessToken(), block);
        collect(newUser().accessToken(), block);
        mvc.perform(bearer(get("/api/v1/me/notifications"), creator).header("Accept-Language", EN))
                .andExpect(jsonPath("$.data.content[0].type").value("BLOCK_COLLECTED"))
                .andExpect(jsonPath("$.data.content[0].message").value("@테스터 and 1 other added your block ‘테스트 톤 640’"))
                .andExpect(jsonPath("$.data.content[1].message").value("‘테스트 톤 640’ was approved and is now in the Block Shop"));
        getWithToken("/api/v1/me/notifications", creator)
                .andExpect(jsonPath("$.data.content[0].message").value("@테스터님 외 1명이 ‘테스트 톤 640’ 블록을 담았어요"));

        // 신고로 내려진 블록: 이유 앞 글("신고로 내려졌어요: ")만 영어, 관리자가 적은 이유는 그대로
        long reported = uploadApprovedBlock(creator, 12, 650);
        String admin = admin().accessToken();
        postJson("/api/v1/reports", "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"reason\":\"COPYRIGHT\",\"detail\":\"남의 노래\"}".formatted(reported))
                .andExpect(status().isCreated());
        postJson("/api/v1/admin/reports/resolve",
                "{\"targetType\":\"BLOCK\",\"targetId\":%d,\"action\":\"HIDE\",\"note\":\"남의 노래가 들어 있어요\"}".formatted(reported), admin)
                .andExpect(status().isOk());
        String en = json(mvc.perform(bearer(get("/api/v1/me/notifications"), creator).header("Accept-Language", EN)));
        List<String> notes = JsonPath.read(en, "$.data.content[?(@.type == 'BLOCK_REJECTED')].note");
        assertThat(notes).containsExactly("Taken down after a report: 남의 노래가 들어 있어요");

        // 내가 올린 블록의 돌려보낸 이유도
        mvc.perform(bearer(get("/api/v1/me/uploads?size=50"), creator).header("Accept-Language", EN))
                .andExpect(jsonPath("$.data.content[?(@.id == " + reported + ")].reviewNote")
                        .value(hasItem("Taken down after a report: 남의 노래가 들어 있어요")));
    }

    @Test
    @DisplayName("담아 온 조합은 영어 제목도 복사, 영어 화면에서 그대로 저장해도 한국어 제목이 안 바뀜. 제목을 고치면 그 제목으로")
    void collectAndSave() throws Exception {
        String token = newUser().accessToken();
        String body = json(mvc.perform(bearer(post("/api/v1/playlists/3/collect"), token).header("Accept-Language", EN))
                .andExpect(status().isOk()));
        long copy = ((Number) JsonPath.read(body, "$.data.id")).longValue();
        String detail = json(mvc.perform(bearer(get("/api/v1/playlists/" + copy), token).header("Accept-Language", EN)));
        assertThat((String) JsonPath.read(detail, "$.data.title")).isEqualTo("Rain dripping in the mountains");
        String koTitle = JsonPath.read(json(getWithToken("/api/v1/playlists/" + copy, token)), "$.data.title");
        assertThat(koTitle).matches(".*[가-힣].*");

        // 영어 화면에서 받은 그대로 저장 → 한국어 제목 그대로, 영어 제목도 그대로
        String save = """
                {"title":"Rain dripping in the mountains","description":"%s","isPublic":false,"listenMinutes":0,
                 "main":{"volume":1,"items":[{"blockId":3,"repeat":1}]}}
                """.formatted(JsonPath.read(detail, "$.data.description").toString());
        mvc.perform(bearer(put("/api/v1/playlists/" + copy), token).header("Accept-Language", EN)
                .contentType(MediaType.APPLICATION_JSON).content(save)).andExpect(status().isOk());
        assertThat((String) JsonPath.read(json(getWithToken("/api/v1/playlists/" + copy, token)), "$.data.title")).isEqualTo(koTitle);
        assertThat((String) JsonPath.read(json(mvc.perform(bearer(get("/api/v1/playlists/" + copy), token).header("Accept-Language", EN))),
                "$.data.title")).isEqualTo("Rain dripping in the mountains");

        // 제목을 새로 쓰면 두 언어 모두 그 제목
        mvc.perform(bearer(put("/api/v1/playlists/" + copy), token).contentType(MediaType.APPLICATION_JSON)
                .content(save.replace("Rain dripping in the mountains", "내 산속 빗소리"))).andExpect(status().isOk());
        assertThat((String) JsonPath.read(json(mvc.perform(bearer(get("/api/v1/playlists/" + copy), token).header("Accept-Language", EN))),
                "$.data.title")).isEqualTo("내 산속 빗소리");
    }
}
