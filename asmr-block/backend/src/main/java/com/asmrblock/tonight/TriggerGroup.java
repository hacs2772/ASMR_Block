package com.asmrblock.tonight;

import java.util.List;
import java.util.Set;

/**
 * 트리거 묶음 (대분류) 하나: 코드·한국어/영어 이름·소분류 이름들.
 * ambient = 배경으로 깔기 좋은 묶음(빗소리·자연·장소·노이즈) → 둘째 줄 후보
 */
public record TriggerGroup(String code, String name, String nameEn, List<String> subs, boolean ambient) {

    public static final Set<String> AMBIENT = Set.of("rain", "nature", "place", "noise");

    /** 짧은 이름: "탭핑·타건" → "탭핑", "Tapping &amp; Typing" → "Tapping" (조합 이름에 씀) */
    public static String shortName(String name) {
        if (name == null) return "";
        return name.split("·| & |&|/")[0].trim();
    }
}
