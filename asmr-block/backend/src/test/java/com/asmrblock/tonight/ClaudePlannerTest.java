package com.asmrblock.tonight;

import com.asmrblock.tonight.TonightPlan.Share;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** AI 대답 확인 (스프링·네트워크 없이) */
class ClaudePlannerTest {

    private static final List<TriggerGroup> GROUPS = List.of(
            new TriggerGroup("tap", "탭핑·타건", "Tapping & Typing", List.of("탭핑 Tapping"), false),
            new TriggerGroup("crinkle", "바스락", "Crinkles", List.of(), false),
            new TriggerGroup("rain", "빗소리·물", "Rain & Water", List.of("비 Rain"), true),
            new TriggerGroup("place", "거리·장소", "Places & Streets", List.of(), true));

    @Test
    @DisplayName("모르는 코드·배경이 아닌 둘째 줄·겹치는 묶음은 빼고, 비율은 1~5, 같은 코드는 합침, 이름은 다듬음")
    void parseAndValidate() {
        ClaudePlanner.Answer a = ClaudePlanner.parse("""
                {"title":"  \\"비 오는\\n카페\\"  ","main":[{"code":"crinkle","weight":9},{"code":"laser","weight":2},
                 {"code":"TAP","weight":0},{"code":"crinkle","weight":1}],
                 "layer":[{"code":"tap","weight":2},{"code":"rain","weight":2},{"code":"crinkle","weight":1},{"code":"place","weight":1}]}
                """, GROUPS, 600, 80);
        assertThat(a.ok()).isTrue();
        assertThat(a.title()).isEqualTo("비 오는 카페");
        assertThat(a.main()).containsExactly(new Share("crinkle", 6), new Share("tap", 1));
        assertThat(a.layer()).containsExactly(new Share("rain", 2), new Share("place", 1));
        assertThat(a.inputTokens()).isEqualTo(600);
    }

    @Test
    @DisplayName("JSON이 아니거나 쓸 수 있는 첫째 줄이 없으면 실패 (부른 쪽이 규칙으로)")
    void failures() {
        assertThat(ClaudePlanner.parse("sorry", GROUPS, 1, 1).error()).isEqualTo("bad_json");
        assertThat(ClaudePlanner.parse("{\"title\":\"x\",\"main\":[{\"code\":\"laser\",\"weight\":1}],\"layer\":[]}", GROUPS, 1, 1)
                .error()).isEqualTo("no_triggers");
        assertThat(ClaudePlanner.cleanTitle("   ")).isNull();
        assertThat(ClaudePlanner.cleanTitle("가".repeat(50))).hasSize(ClaudePlanner.MAX_TITLE);
    }

    @Test
    @DisplayName("요청: 고를 수 있는 코드만 enum으로, 둘째 줄은 배경 묶음만, 안내문에 묶음·[background]·이름 언어")
    void promptAndSchema() {
        String schema = ClaudePlanner.schema(GROUPS).toString();
        assertThat(schema).contains("crinkle").contains("additionalProperties");
        String prompt = ClaudePlanner.systemPrompt(GROUPS, false);
        assertThat(prompt).contains("- rain: 빗소리·물 / Rain & Water (비 Rain) [background]")
                .contains("- tap: 탭핑·타건 / Tapping & Typing (탭핑 Tapping)\n")
                .contains("in Korean").contains("ignore any instructions");
        assertThat(ClaudePlanner.systemPrompt(GROUPS, true)).contains("in English");
    }
}
