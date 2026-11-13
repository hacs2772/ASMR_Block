package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryApiTest extends IntegrationTest {

    @Test
    @DisplayName("카테고리는 트리거 묶음(대분류) > 소분류 트리, 소분류는 대분류 색과 code를 씀")
    void categoryTree() throws Exception {
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(10))
                .andExpect(jsonPath("$.data[*].name", hasItems("탭핑·타건", "바스락", "귓속말·입소리", "노이즈·명상")))
                .andExpect(jsonPath("$.data[0].code").value("tap"))
                .andExpect(jsonPath("$.data[0].name").value("탭핑·타건"))
                .andExpect(jsonPath("$.data[0].children[*].name", hasItems("탭핑", "키보드 타건", "시계·딸깍")))
                .andExpect(jsonPath("$.data[0].children[*].color", everyItem(is("#FF8A3D"))))
                .andExpect(jsonPath("$.data[0].children[0].code").value("tap.tapping"))
                .andExpect(jsonPath("$.data[0].children[0].groupCode").value("tap"))
                .andExpect(jsonPath("$.data[?(@.code == 'place')].children[*].name", hasItem("거리·교통")))
                // 옛 분류 이름은 더 이상 안 보임
                .andExpect(jsonPath("$.data[*].name", not(hasItem("트렌드"))));
    }

    @Test
    @DisplayName("대분류로 고르면 소분류 블록까지 나오고, 소분류로 고르면 그것만")
    void filterByGroupIncludesChildren() throws Exception {
        String tree = json(mvc.perform(get("/api/v1/categories")));
        Number rainId = JsonPath.<java.util.List<Number>>read(tree, "$.data[?(@.code == 'rain')].id").get(0);
        Number seaId = JsonPath.<java.util.List<Number>>read(tree, "$.data[*].children[?(@.code == 'rain.sea')].id").get(0);
        // 빗소리·물 → 비(빗소리) + 바다·파도(파도)
        mvc.perform(get("/api/v1/blocks?size=100&categoryId=" + rainId))
                .andExpect(jsonPath("$.data.content[*].title", hasItems("잔잔한 빗소리", "밤바다 파도")))
                .andExpect(jsonPath("$.data.content[*].category.parentName", everyItem(is("빗소리·물"))))
                .andExpect(jsonPath("$.data.content[*].category.groupCode", everyItem(is("rain"))));
        mvc.perform(get("/api/v1/blocks?size=100&categoryId=" + seaId))
                .andExpect(jsonPath("$.data.content[*].title", hasItem("밤바다 파도")))
                .andExpect(jsonPath("$.data.content[*].title", not(hasItem("잔잔한 빗소리"))));
    }

    @Test
    @DisplayName("요즘 뜨는 소리: 최근 7일 재생이 많은 순 (샘플: 원목 책상 탭핑 1위)")
    void trending() throws Exception {
        mvc.perform(get("/api/v1/blocks/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("원목 책상 탭핑"))
                .andExpect(jsonPath("$.data[0].recentPlays").value(45))
                .andExpect(jsonPath("$.data[0].category.parentName").value("탭핑·타건"))
                .andExpect(jsonPath("$.data[0].uploader.nickname").value("tappy_room"))
                .andExpect(jsonPath("$.data[1].title").value("왁스 부수기"));
        mvc.perform(get("/api/v1/blocks/trending?size=2")).andExpect(jsonPath("$.data.length()").value(2));
    }
}
