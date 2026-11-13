package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryApiTest extends IntegrationTest {

    @Test
    @DisplayName("카테고리는 대분류 > 소분류 트리, 소분류는 대분류 색을 씀")
    void categoryTree() throws Exception {
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", hasItems("자연", "노이즈", "장소·세계의 소리", "트렌드")))
                .andExpect(jsonPath("$.data[0].name").value("자연"))
                .andExpect(jsonPath("$.data[0].children[*].name", hasItems("비·물", "바람·숲", "바다·파도")))
                .andExpect(jsonPath("$.data[0].children[*].color", everyItem(is("#22C55E"))))
                .andExpect(jsonPath("$.data[?(@.name == '장소·세계의 소리')].children[*].name", hasItem("일본")));
    }

    @Test
    @DisplayName("대분류로 고르면 소분류 블록까지 나오고, 소분류로 고르면 그것만")
    void filterByGroupIncludesChildren() throws Exception {
        // 자연(1) → 빗소리, 파도, 바람
        mvc.perform(get("/api/v1/blocks?categoryId=1&size=100"))
                .andExpect(jsonPath("$.data.content[*].title", hasItems("잔잔한 빗소리", "밤바다 파도", "숲속 바람")))
                .andExpect(jsonPath("$.data.content[*].category.parentName", everyItem(is("자연"))));
    }

    @Test
    @DisplayName("요즘 뜨는 소리: 최근 7일 재생이 많은 순 (샘플: 왁스 부수기 1위)")
    void trending() throws Exception {
        mvc.perform(get("/api/v1/blocks/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("왁스 부수기"))
                .andExpect(jsonPath("$.data[0].recentPlays").value(40))
                .andExpect(jsonPath("$.data[0].category.parentName").value("트렌드"))
                .andExpect(jsonPath("$.data[1].title").value("비누 깎기"));
        mvc.perform(get("/api/v1/blocks/trending?size=2")).andExpect(jsonPath("$.data.length()").value(2));
    }
}
