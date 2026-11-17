package com.asmrblock.tonight;

import com.asmrblock.playlist.PlaylistDtos;
import com.asmrblock.playlist.PlaylistDtos.PlaylistDetailResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class TonightDtos {

    private TonightDtos() {
    }

    /** 한 줄 최대 글자 */
    public static final int MAX_PROMPT = 80;

    /**
     * 오늘 밤 조합 만들기. prompt = "비 오는 날 카페에서 책 읽는 느낌" 같은 한 줄 (생략하면 내 취향대로),
     * listenMinutes 생략 시 60분
     */
    public record TonightRequest(
            @Size(max = MAX_PROMPT, message = "한 줄은 80자까지 적을 수 있어요.")
            String prompt,

            @Min(value = 0, message = "재생 시간은 0분 이상이어야 합니다.")
            @Max(value = PlaylistDtos.MAX_LISTEN_MINUTES, message = "재생 시간은 최대 10시간까지 고를 수 있습니다.")
            Integer listenMinutes) {
    }

    /**
     * 화면용 안내: ai = AI가 켜져 있는지(꺼져 있어도 한 줄은 낱말로 찾아 줌), aiLeftToday = 오늘 남은 AI 횟수(로그인했고 AI가 켜졌을 때만)
     */
    public record TonightInfo(boolean ai, int maxPromptLength, Integer aiLeftToday) {
    }

    /** 조합에 들어간 트리거 묶음과 비율(%) */
    public record TriggerShare(String code, String name, int percent) {
    }

    /**
     * 만든 조합 + 어떻게 정했는지.
     * source = AI · WORDS(한 줄에서 낱말로) · TASTE(내 취향) · STARTER(기본),
     * note = AI_LIMIT(오늘 AI 횟수를 다 씀) · AI_FAILED(AI가 대답을 못 함) · NO_MATCH(한 줄에서 소리를 못 찾아 취향대로) · null
     */
    public record TonightResponse(PlaylistDetailResponse playlist, String source, String note,
                                  List<TriggerShare> main, List<TriggerShare> layer) {
    }
}
