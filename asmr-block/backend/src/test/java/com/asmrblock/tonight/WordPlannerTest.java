package com.asmrblock.tonight;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** AI 없이 한 줄에서 트리거 찾기 */
class WordPlannerTest {

    private final WordPlanner words = new WordPlanner();

    @Test
    @DisplayName("비 오는 날 카페에서 책 읽는 느낌 → 빗소리·장소·바스락")
    void example() {
        assertThat(words.match("비 오는 날 카페에서 책 읽는 느낌").keySet()).containsExactlyInAnyOrder("rain", "place", "crinkle");
        assertThat(words.match("Rainy night in a cafe with soft whispers").keySet())
                .containsExactlyInAnyOrder("rain", "place", "whisper");
    }

    @Test
    @DisplayName("긴 낱말이 먼저: 비닐은 바스락(빗소리 아님), 빗질은 스크래칭, train은 장소(rain 아님)")
    void longerWordsFirst() {
        assertThat(words.match("비닐 바스락").keySet()).containsExactly("crinkle");
        assertThat(words.match("천천히 빗질해 주는 소리").keySet()).containsExactly("scratch");
        assertThat(words.match("a quiet train at night").keySet()).containsExactly("place");
        assertThat(words.match("오늘은 그냥 푹 자고 싶어")).isEmpty();
        assertThat(words.match(null)).isEmpty();
    }
}
