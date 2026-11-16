package com.asmrblock.i18n;

/**
 * 이번 요청의 화면 언어 (ko · en). {@link LangFilter}가 요청마다 정함 — 웹·앱은 Accept-Language에 지금 화면 언어를 보냄.
 * 정해지지 않은 곳(스케줄 작업·테스트 등)은 한국어
 */
public final class Lang {

    public static final String KO = "ko";
    public static final String EN = "en";

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private Lang() {
    }

    public static String current() {
        String lang = CURRENT.get();
        return lang == null ? KO : lang;
    }

    public static boolean english() {
        return EN.equals(current());
    }

    /** 영어 화면이고 영어 글이 있으면 영어, 아니면 원래 글 (블록·조합·분류·스티커 이름) */
    public static String pick(String original, String english) {
        return english() && english != null && !english.isBlank() ? english : original;
    }

    /** Accept-Language("en-US,en;q=0.9,ko;q=0.8")의 맨 앞 언어가 영어면 en, 그 밖(없음·한국어·다른 언어)은 ko */
    public static String fromHeader(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) return KO;
        String first = acceptLanguage.split(",")[0].trim().toLowerCase();
        return first.startsWith(EN) ? EN : KO;
    }

    static void set(String lang) {
        CURRENT.set(EN.equals(lang) ? EN : KO);
    }

    static void clear() {
        CURRENT.remove();
    }

    /** 테스트·다른 스레드에서 잠깐 언어를 정해 실행 */
    public static <T> T with(String lang, java.util.function.Supplier<T> work) {
        String before = CURRENT.get();
        set(lang);
        try {
            return work.get();
        } finally {
            if (before == null) CURRENT.remove();
            else CURRENT.set(before);
        }
    }
}
