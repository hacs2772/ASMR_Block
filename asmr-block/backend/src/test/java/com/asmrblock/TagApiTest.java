package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 소리 느낌 태그(V22): 18개 기본 태그(영어 이름까지) · 올릴 때 달기 · 고치기에서 바꾸기 · 상점에서 태그로 찾기 · 관리자 추가·숨기기·순서.
 * 트리거 소분류도 묶음마다 4~6개로 늘어남 (tap.nail 등)
 */
@SuppressWarnings("unchecked")
class TagApiTest extends IntegrationTest {

    private long tagId(String code) throws Exception {
        List<Integer> ids = JsonPath.read(json(mvc.perform(get("/api/v1/tags"))), "$.data[?(@.code == '" + code + "')].id");
        assertThat(ids).as(code).hasSize(1);
        return ids.get(0);
    }

    @Test
    @DisplayName("기본 태그 18개 (영어 화면은 영어 이름) · 소분류 22개 더 · 머리 빗기 아이콘은 반짝이 아님")
    void builtIns() throws Exception {
        mvc.perform(get("/api/v1/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(18)))
                .andExpect(jsonPath("$.data[0].code").value("soft"))
                .andExpect(jsonPath("$.data[0].name").value("부드러운"))
                .andExpect(jsonPath("$.data[?(@.code == 'wet')].name").value(hasItem("촉촉한")))
                .andExpect(jsonPath("$.data[*].code", hasItems("slow", "fast", "sticky", "closeup", "eartoear", "sleepy", "focus")));
        mvc.perform(get("/api/v1/tags").header("Accept-Language", "en"))
                .andExpect(jsonPath("$.data[?(@.code == 'eartoear')].name").value(hasItem("Ear to ear")))
                .andExpect(jsonPath("$.data[?(@.code == 'squishy')].name").value(hasItem("Squishy")));

        String tree = json(mvc.perform(get("/api/v1/categories")));
        List<String> subs = JsonPath.read(tree, "$.data[*].children[*].code");
        assertThat(subs).contains("tap.nail", "tap.glass", "crinkle.bubble", "whisper.ear", "whisper.massage",
                "slime.sand", "cut.soap", "rain.thunder", "nature.night", "place.library", "place.plane", "noise.fan");
        assertThat(subs.size()).isGreaterThanOrEqualTo(50);
        List<String> combIcon = JsonPath.read(tree, "$.data[*].children[?(@.code == 'scratch.comb')].icon");
        assertThat(combIcon).containsExactly("hand-right");
        mvc.perform(get("/api/v1/categories").header("Accept-Language", "en"))
                .andExpect(jsonPath("$.data[*].children[?(@.code == 'whisper.ear')].name").value(hasItem("Ear cleaning")));
    }

    @Test
    @DisplayName("올릴 때 태그 달기 → 블록 카드에 태그 · 상점에서 태그로 찾기 · 고치기에서 바꾸기·빼기 · 없는 태그 400")
    void uploadEditAndFilter() throws Exception {
        String creator = newUser().accessToken();
        long crispy = tagId("crispy");
        long slow = tagId("slow");
        long sleepy = tagId("sleepy");
        long id = idOf(mvc.perform(bearer(multipart("/api/v1/blocks")
                        .file(new MockMultipartFile("file", "tone.mp3", "audio/mpeg", TestAudio.sineMp3(12, 730))), creator)
                        .param("title", "태그 달린 블록").param("categoryId", String.valueOf(leafCategoryId())).param("license", "OWN")
                        .param("tagIds", String.valueOf(crispy), String.valueOf(slow)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.tags[*].code", hasItems("crispy", "slow"))));
        patchJson("/api/v1/admin/blocks/" + id + "/status", "{\"status\":\"APPROVED\"}", admin().accessToken()).andExpect(status().isOk());

        // 상점: 태그로 찾기 (둘 중 하나라도), 영어 화면은 영어 이름
        mvc.perform(get("/api/v1/blocks").param("tagIds", String.valueOf(slow)).param("size", "100"))
                .andExpect(jsonPath("$.data.content[*].id", hasItem((int) id)));
        mvc.perform(get("/api/v1/blocks").param("tagIds", String.valueOf(sleepy)).param("size", "100"))
                .andExpect(jsonPath("$.data.content[*].id", not(hasItem((int) id))));
        mvc.perform(get("/api/v1/blocks/" + id).header("Accept-Language", "en"))
                .andExpect(jsonPath("$.data.tags[*].name", hasItems("Crispy", "Slow")));

        // 내가 올린 블록: 고치기 화면용 태그
        getWithToken("/api/v1/me/uploads", creator)
                .andExpect(jsonPath("$.data.content[0].tags[*].code", hasItems("crispy", "slow")));
        // 고치기: 통째로 바꿈 → 승인된 블록은 그대로 APPROVED
        patchJson("/api/v1/me/uploads/" + id, "{\"tagIds\":[" + sleepy + "]}", creator)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tags", hasSize(1)))
                .andExpect(jsonPath("$.data.tags[0].code").value("sleepy"))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
        mvc.perform(get("/api/v1/blocks").param("tagIds", String.valueOf(sleepy)).param("size", "100"))
                .andExpect(jsonPath("$.data.content[*].id", hasItem((int) id)));
        // 빈 목록 = 모두 뺌, 다른 칸은 그대로
        patchJson("/api/v1/me/uploads/" + id, "{\"tagIds\":[]}", creator)
                .andExpect(jsonPath("$.data.tags", hasSize(0)))
                .andExpect(jsonPath("$.data.title").value("태그 달린 블록"));
        // 없는 태그
        patchJson("/api/v1/me/uploads/" + id, "{\"tagIds\":[999999]}", creator).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("관리자: 태그 추가(코드 자동)·이름 고치기·숨기기·순서 → 숨긴 태그는 목록·새로 달기에서 빠짐, 일반 사용자는 403")
    void adminManagesTags() throws Exception {
        String admin = admin().accessToken();
        String user = newUser().accessToken();
        postJson("/api/v1/admin/tags", "{\"name\":\"몰래\"}", user).andExpect(status().isForbidden());

        String created = json(postJson("/api/v1/admin/tags", "{\"name\":\"사각사각\",\"nameEn\":\"Scritchy\"}", admin)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("태그를 추가했어요.")));
        List<Integer> ids = JsonPath.read(created, "$.data[?(@.name == '사각사각')].id");
        long id = ids.get(0);
        List<String> codes = JsonPath.read(created, "$.data[?(@.name == '사각사각')].code");
        assertThat(codes).containsExactly("t" + id);
        mvc.perform(get("/api/v1/tags").header("Accept-Language", "en"))
                .andExpect(jsonPath("$.data[?(@.code == 't%d')].name".formatted(id)).value(hasItem("Scritchy")));

        patchJson("/api/v1/admin/tags/" + id, "{\"name\":\"사각\",\"nameEn\":\"\"}", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == %d)].name".formatted(id)).value(hasItem("사각")))
                .andExpect(jsonPath("$.data[?(@.id == %d)].nameEn".formatted(id)).value(hasItem((Object) null)));
        putJson("/api/v1/admin/tags/order", "{\"ids\":[" + id + "]}", admin)
                .andExpect(jsonPath("$.data[?(@.id == %d)].sortOrder".formatted(id)).value(hasItem(1)));

        patchJson("/api/v1/admin/tags/" + id, "{\"active\":false}", admin)
                .andExpect(jsonPath("$.data[?(@.id == %d)].active".formatted(id)).value(hasItem(false)));
        mvc.perform(get("/api/v1/tags")).andExpect(jsonPath("$.data[*].id", not(hasItem((int) id))));
        // 숨긴 태그는 새로 달 수 없음
        long block = uploadApprovedBlock(user, 12, 740);
        patchJson("/api/v1/me/uploads/" + block, "{\"tagIds\":[" + id + "]}", user).andExpect(status().isBadRequest());

        patchJson("/api/v1/admin/tags/999999", "{\"active\":true}", admin).andExpect(status().isNotFound());
        patchJson("/api/v1/admin/tags/" + id, "{\"name\":\" \"}", admin).andExpect(status().isBadRequest());
    }
}
