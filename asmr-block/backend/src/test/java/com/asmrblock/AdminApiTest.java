package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 관리자 페이지: 트리거 종류·스티커 관리, 블록 돌려보내기(이유) */
class AdminApiTest extends IntegrationTest {

    private static final String SVG = "<?xml version=\"1.0\"?>\n<!-- 등대 -->\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 30\">"
            + "<rect x=\"6\" y=\"8\" width=\"8\" height=\"20\" fill=\"#e8e8ef\"/><circle cx=\"10\" cy=\"5\" r=\"4\" fill=\"#ffd36b\"/></svg>";

    @Test
    @DisplayName("관리자 API는 관리자만: 일반 회원 403, 비로그인 401")
    void adminOnly() throws Exception {
        String user = newUser().accessToken();
        getWithToken("/api/v1/admin/categories", user).andExpect(status().isForbidden());
        postJson("/api/v1/admin/categories", "{\"name\":\"몰래\",\"color\":\"#123456\",\"icon\":\"star\"}", user)
                .andExpect(status().isForbidden());
        mvc.perform(bearer(multipart("/api/v1/admin/stickers").file(svgFile(SVG)).param("name", "몰래"), user))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/categories")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("트리거 종류: 묶음·소분류 추가 → 앱 메뉴에 바로, 묶음 색을 바꾸면 소분류도, 숨기면 메뉴·업로드에서 빠짐")
    void manageCategories() throws Exception {
        String admin = admin().accessToken();
        // 묶음(대분류): 코드를 안 적으면 자동
        String tree = json(postJson("/api/v1/admin/categories",
                "{\"name\":\"ASMR 테스트 묶음\",\"color\":\"#123456\",\"icon\":\"star\",\"description\":\"테스트용\"}", admin)
                .andExpect(status().isCreated()));
        Map<String, Object> group = find(tree, "ASMR 테스트 묶음");
        long groupId = ((Number) group.get("id")).longValue();
        assertThat(group.get("code")).isEqualTo("g" + groupId);
        assertThat(group.get("active")).isEqualTo(true);

        // 묶음에 색이 없으면 거절, 소분류 아래 소분류도 거절
        postJson("/api/v1/admin/categories", "{\"name\":\"색 없음\",\"icon\":\"star\"}", admin)
                .andExpect(status().isBadRequest());

        // 소분류: 색은 묶음 색을 따름, 코드는 묶음코드.적은코드
        tree = json(postJson("/api/v1/admin/categories",
                "{\"parentId\":%d,\"name\":\"등대 소리\",\"code\":\"lighthouse\",\"icon\":\"boat\"}".formatted(groupId), admin)
                .andExpect(status().isCreated()));
        Map<String, Object> child = find(tree, "등대 소리");
        long childId = ((Number) child.get("id")).longValue();
        assertThat(child.get("code")).isEqualTo("g" + groupId + ".lighthouse");
        assertThat(child.get("color")).isEqualTo("#123456");
        postJson("/api/v1/admin/categories",
                "{\"parentId\":%d,\"name\":\"또 아래\",\"icon\":\"star\"}".formatted(childId), admin).andExpect(status().isBadRequest());
        postJson("/api/v1/admin/categories",
                "{\"parentId\":%d,\"name\":\"같은 코드\",\"code\":\"lighthouse\",\"icon\":\"star\"}".formatted(groupId), admin)
                .andExpect(status().isConflict());
        postJson("/api/v1/admin/categories",
                "{\"parentId\":%d,\"name\":\"두번째\",\"icon\":\"water\"}".formatted(groupId), admin).andExpect(status().isCreated());

        // 앱·웹 메뉴(GET /categories)에 바로 보임
        mvc.perform(get("/api/v1/categories"))
                .andExpect(jsonPath("$.data[?(@.id == %d)].children[*].name".formatted(groupId), hasItem("등대 소리")));
        // 새 소분류에 블록을 올릴 수 있음
        uploadTo(childId).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.category.color").value("#123456"))
                .andExpect(jsonPath("$.data.category.icon").value("boat"));

        // 묶음 색을 바꾸면 소분류 색도 (블록 색 = 묶음), 소분류 색만 따로 바꾸는 건 거절
        tree = json(patchJson("/api/v1/admin/categories/" + groupId, "{\"color\":\"#654321\",\"name\":\"ASMR 테스트 묶음2\"}", admin)
                .andExpect(status().isOk()));
        assertThat(find(tree, "등대 소리").get("color")).isEqualTo("#654321");
        assertThat(find(tree, "등대 소리").get("blockCount")).isEqualTo(1);
        patchJson("/api/v1/admin/categories/" + childId, "{\"color\":\"#000000\"}", admin).andExpect(status().isBadRequest());

        // 소분류 순서 바꾸기 (같은 줄끼리만)
        List<Number> childIds = JsonPath.read(tree, "$.data[?(@.id == %d)].children[*].id".formatted(groupId));
        long second = childIds.get(1).longValue();
        tree = json(putJson("/api/v1/admin/categories/order", "{\"ids\":[%d,%d]}".formatted(second, childId), admin)
                .andExpect(status().isOk()));
        List<Number> reordered = JsonPath.read(tree, "$.data[?(@.id == %d)].children[*].id".formatted(groupId));
        assertThat(reordered.getFirst().longValue()).isEqualTo(second);
        putJson("/api/v1/admin/categories/order", "{\"ids\":[%d,%d]}".formatted(groupId, childId), admin)
                .andExpect(status().isBadRequest());

        // 묶음을 숨기면 메뉴에서 빠지고, 그 아래 소분류로는 못 올림 (이미 있는 블록은 그대로)
        patchJson("/api/v1/admin/categories/" + groupId, "{\"active\":false}", admin).andExpect(status().isOk());
        mvc.perform(get("/api/v1/categories"))
                .andExpect(jsonPath("$.data[*].id", not(hasItem((int) groupId))));
        uploadTo(childId).andExpect(status().isBadRequest());
        getWithToken("/api/v1/admin/categories", admin)
                .andExpect(jsonPath("$.data[?(@.id == %d)].active".formatted(groupId)).value(false));
    }

    @Test
    @DisplayName("스티커: 관리자가 SVG·PNG를 올리면 바로 고를 수 있고, 위험한 SVG는 거절, 숨기면 새로는 못 붙임")
    void manageStickers() throws Exception {
        String admin = admin().accessToken();
        // 기본 스티커 16개 (로그인 없이 그림까지)
        mvc.perform(get("/api/v1/stickers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'flagjp')].svg").value(hasItem(startsWith("<svg"))))
                .andExpect(jsonPath("$.data[?(@.code == 'flagjp')].name").value(hasItem("일본")));

        // SVG 추가: xml 선언·주석은 지우고 저장
        String created = json(mvc.perform(bearer(multipart("/api/v1/admin/stickers").file(svgFile(SVG)).param("name", "등대"), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value(startsWith("s")))
                .andExpect(jsonPath("$.data.svg").value(startsWith("<svg")))
                .andExpect(jsonPath("$.data.active").value(true)));
        String code = JsonPath.read(created, "$.data.code");
        mvc.perform(get("/api/v1/blocks/upload-policy")).andExpect(jsonPath("$.data.stickers", hasItem(code)));
        String seller = newUser().accessToken();
        uploadWithStickers(seller, code + ",flagjp").andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.design.stickers[0]").value(code));

        // 위험하거나 앱에서 안 그려지는 SVG는 거절
        for (String bad : List.of(
                "<svg viewBox=\"0 0 10 10\"><script>alert(1)</script></svg>",
                "<svg viewBox=\"0 0 10 10\" onload=\"alert(1)\"><rect width=\"10\" height=\"10\"/></svg>",
                "<svg viewBox=\"0 0 10 10\"><image href=\"https://example.com/a.png\"/></svg>",
                "<svg viewBox=\"0 0 10 10\"><style>rect{fill:red}</style></svg>",
                "<svg width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\"/></svg>",
                "<html><svg viewBox=\"0 0 10 10\"></svg></html>")) {
            mvc.perform(bearer(multipart("/api/v1/admin/stickers").file(svgFile(bad)).param("name", "나쁜"), admin))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.message").value(containsString("이 SVG는 쓸 수 없어요")));
        }

        // PNG 추가: 256px PNG로 줄여서 파일로
        mvc.perform(bearer(multipart("/api/v1/admin/stickers")
                        .file(new MockMultipartFile("file", "lamp.png", "image/png", TestAudio.testPng())).param("name", "램프"), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.svg").doesNotExist())
                .andExpect(jsonPath("$.data.imageUrl").value(endsWith(".png")));

        // 이름 바꾸기, 순서 맨 앞으로
        patchJson("/api/v1/admin/stickers/" + code, "{\"name\":\"등대2\"}", admin)
                .andExpect(jsonPath("$.data.name").value("등대2"));
        putJson("/api/v1/admin/stickers/order", "{\"codes\":[\"%s\",\"flagjp\"]}".formatted(code), admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value(code))
                .andExpect(jsonPath("$.data[1].code").value("flagjp"));

        // 숨기면: 목록엔 남아서(이미 붙인 블록이 그림) active=false, 업로드 규칙에선 빠지고 새로 붙이면 거절
        patchJson("/api/v1/admin/stickers/" + code, "{\"active\":false}", admin).andExpect(status().isOk());
        mvc.perform(get("/api/v1/stickers"))
                .andExpect(jsonPath("$.data[?(@.code == '%s')].active".formatted(code)).value(hasItem(false)));
        mvc.perform(get("/api/v1/blocks/upload-policy")).andExpect(jsonPath("$.data.stickers", not(hasItem(code))));
        uploadWithStickers(seller, code).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.message").value("없는 스티커예요: " + code));
        patchJson("/api/v1/admin/stickers/없음", "{\"active\":true}", admin).andExpect(status().isNotFound());
        // 순서 되돌리기 (다른 테스트에 영향 없게)
        putJson("/api/v1/admin/stickers/order", "{\"codes\":[\"flagjp\",\"flagkr\"]}", admin).andExpect(status().isOk());
    }

    @Test
    @DisplayName("블록 돌려보내기: 이유가 판매자의 내가 올린 블록에 보이고, 승인하면 지워짐")
    void rejectWithNote() throws Exception {
        String admin = admin().accessToken();
        String seller = newUser().accessToken();
        long id = idOf(upload(seller, TestAudio.sineMp3(12, 610), "quiet.mp3", "작은 소리").andExpect(status().isCreated()));

        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"REJECTED\",\"note\":\"소리가 너무 작아요\"}", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
        getWithToken("/api/v1/me/uploads", seller)
                .andExpect(jsonPath("$.data.content[0].status").value("REJECTED"))
                .andExpect(jsonPath("$.data.content[0].reviewNote").value("소리가 너무 작아요"));
        getWithToken("/api/v1/admin/blocks?status=REJECTED", admin)
                .andExpect(jsonPath("$.data.content[*].id", hasItem((int) id)));

        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\",\"note\":\"남으면 안 됨\"}", admin)
                .andExpect(status().isOk());
        getWithToken("/api/v1/me/uploads", seller)
                .andExpect(jsonPath("$.data.content[0].status").value("APPROVED"))
                .andExpect(jsonPath("$.data.content[0].reviewNote").doesNotExist());
    }

    private static MockMultipartFile svgFile(String svg) {
        return new MockMultipartFile("file", "sticker.svg", "image/svg+xml", svg.getBytes(StandardCharsets.UTF_8));
    }

    private ResultActions uploadTo(long categoryId) throws Exception {
        return mvc.perform(bearer(multipart("/api/v1/blocks")
                .file(new MockMultipartFile("file", "tone.mp3", "audio/mpeg", TestAudio.sineMp3(11, 700))), newUser().accessToken())
                .param("title", "등대 블록").param("categoryId", String.valueOf(categoryId)).param("license", "OWN"));
    }

    private ResultActions uploadWithStickers(String token, String stickers) throws Exception {
        return mvc.perform(bearer(multipart("/api/v1/blocks")
                .file(new MockMultipartFile("file", "tone.mp3", "audio/mpeg", TestAudio.sineMp3(11, 720))), token)
                .param("title", "스티커 블록").param("categoryId", String.valueOf(leafCategoryId()))
                .param("license", "OWN").param("stickers", stickers));
    }

    /** 관리자 트리에서 이름으로 찾기 (대분류·소분류 모두) */
    private static Map<String, Object> find(String tree, String name) {
        List<Map<String, Object>> groups = JsonPath.read(tree, "$.data[?(@.name == '%s')]".formatted(name));
        if (!groups.isEmpty()) {
            return groups.getFirst();
        }
        List<Map<String, Object>> children = JsonPath.read(tree, "$.data[*].children[?(@.name == '%s')]".formatted(name));
        assertThat(children).as(name).isNotEmpty();
        return children.getFirst();
    }
}
