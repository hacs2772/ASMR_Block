package com.asmrblock.sticker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 마이그레이션으로 넣는 기본 스티커(V8 16개 + V21 25개)가 관리자 업로드와 같은 SVG 검사(SvgCheck)를 통과하는지.
 * DB 없이 마이그레이션 파일만 읽음 (그림이 바뀌어 script·외부 주소가 섞이거나 viewBox가 빠지면 실패)
 */
class BuiltInStickersTest {

    /** ('code', '이름', ['영어',] '<svg …</svg>', 순서) */
    private static final Pattern ROW = Pattern.compile("\\('([a-z0-9]+)', '[^']+', (?:'([^'<]+)', )?'(<svg.*?</svg>)', \\d+\\)");

    @Test
    @DisplayName("기본 스티커 41개: 모두 SVG 검사 통과, code가 겹치지 않음, V21 새 스티커는 영어 이름도 있음")
    void builtInStickersPassSvgCheck() throws IOException {
        List<String> codes = new ArrayList<>();
        for (String file : List.of("V8__admin_stickers_and_review_note.sql", "V21__more_stickers.sql")) {
            Matcher m = ROW.matcher(read("db/migration/" + file));
            while (m.find()) {
                String code = m.group(1);
                String svg = m.group(3);
                codes.add(code);
                assertThatCode(() -> SvgCheck.clean(svg.getBytes(StandardCharsets.UTF_8)))
                        .as("%s 스티커 SVG", code).doesNotThrowAnyException();
                assertThat(code.length()).as("%s code 길이", code).isLessThanOrEqualTo(20);
                if (file.startsWith("V21")) {
                    assertThat(m.group(2)).as("%s 영어 이름", code).isNotBlank();
                }
            }
        }
        assertThat(codes).hasSize(41);
        Set<String> unique = new HashSet<>(codes);
        assertThat(unique).hasSize(codes.size());
    }

    private static String read(String path) throws IOException {
        try (InputStream in = BuiltInStickersTest.class.getClassLoader().getResourceAsStream(path)) {
            assertThat(in).as(path).isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
