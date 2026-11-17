package com.asmrblock.sleep;

import com.asmrblock.recommend.RecommendDtos.TasteTrigger;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public final class SleepDtos {

    private SleepDtos() {
    }

    /** rating: 0 건너뛰기(다시 안 물어봄) · 1 못 잤어요 · 2 그저 그래요 · 3 잘 잤어요 */
    public record RateRequest(
            @NotNull(message = "잘 잤는지 골라 주세요.")
            @Min(value = 0, message = "잘 잤는지 골라 주세요.")
            @Max(value = 3, message = "잘 잤는지 골라 주세요.")
            Integer rating) {
    }

    /** 그 밤에 틀었던 조합: minutes = 넘은 듣기 단계(10·30·60·120·240·480분, 틀기만 했으면 0) */
    public record SleepCombo(Long id, String title, int minutes) {
    }

    /** 물어볼 밤 (어젯밤): 틀었던 조합들 */
    public record SleepPending(LocalDate night, List<SleepCombo> combos) {
    }

    /** 한 밤: rating = 남긴 답(없으면 null, 0 = 건너뜀), minutes = 조합마다 넘은 단계의 합(대략 들은 시간) */
    public record SleepNightResponse(LocalDate night, Integer rating, int minutes, List<SleepCombo> combos) {
    }

    /** 최근 7일 (오래된 밤 → 어젯밤) + 잘 잔 밤에 많이 들은 트리거 (최근 30일, 최대 3개) */
    public record SleepWeek(List<SleepNightResponse> nights, List<TasteTrigger> goodTriggers) {
    }
}
