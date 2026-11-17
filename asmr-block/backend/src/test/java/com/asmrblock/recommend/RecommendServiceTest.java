package com.asmrblock.recommend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendServiceTest {

    @Test
    @DisplayName("섞기: 점수 순서를 지키되 같은 소분류는 처음엔 2개까지, 모자라면 나머지를 점수 순으로")
    void diversify() {
        List<Scored> rows = List.of(
                new Scored(1, 10, 9), new Scored(2, 10, 8), new Scored(3, 10, 7),
                new Scored(4, 20, 6), new Scored(5, 10, 5), new Scored(6, 30, 4));
        assertThat(RecommendService.diversify(rows, 4, 2)).containsExactly(1L, 2L, 4L, 6L);
        assertThat(RecommendService.diversify(rows, 6, 2)).containsExactly(1L, 2L, 4L, 6L, 3L, 5L);
        assertThat(RecommendService.diversify(rows, 10, 2)).hasSize(6);
        assertThat(RecommendService.diversify(List.of(), 5, 2)).isEmpty();
    }
}
