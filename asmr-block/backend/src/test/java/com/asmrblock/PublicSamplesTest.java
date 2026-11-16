package com.asmrblock;

import com.asmrblock.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 공개용 샘플(db/samples): 공개용처럼 개발용 샘플·테스트 계정 없이 DB를 새로 만들고 샘플만 넣어서 확인.
 * (이 클래스는 설정이 달라서 따로 새 DB를 씀)
 */
@TestPropertySource(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/samples")
class PublicSamplesTest extends IntegrationTest {

    private static final String SAMPLE_EMAIL = "samples@asmrblock.invalid";

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("샘플 블록 20개·공개 조합 5개가 들어가고, 모두 무료·승인됨, 올린 사람은 \"ASMR Block 샘플\"")
    void samplesVisible() throws Exception {
        mvc.perform(get("/api/v1/blocks?size=50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pageInfo.totalElements").value(20))
                .andExpect(jsonPath("$.data.content[*].price", everyItem(org.hamcrest.Matchers.is(0))))
                .andExpect(jsonPath("$.data.content[*].uploader.nickname", everyItem(org.hamcrest.Matchers.is("ASMR Block 샘플"))))
                .andExpect(jsonPath("$.data.content[*].description", everyItem(endsWith("샘플 소리"))))
                .andExpect(jsonPath("$.data.content[*].recordedPlace", everyItem(org.hamcrest.Matchers.nullValue())));
        String publicCombos = json(mvc.perform(get("/api/v1/playlists/public?size=50")).andExpect(status().isOk()));
        List<String> titles = JsonPath.read(publicCombos, "$.data.content[*].title");
        assertThat(titles).containsExactlyInAnyOrder("비 오는 밤 작업용", "잠들기 전 루틴", "산에서 빗물 떨어지는 소리",
                "왁뿌 팅글 모음", "잠 안 올 때 탭핑 + 빗소리");
        List<Integer> durations = JsonPath.read(publicCombos, "$.data.content[*].totalDuration");
        assertThat(durations).allMatch(d -> d > 0);
    }

    @Test
    @DisplayName("재생 기록이 없어도 요즘 뜨는 블록·조합이 비지 않음 (새로 올라온 순으로 채움)")
    void trendingFilledOnNewSite() throws Exception {
        mvc.perform(get("/api/v1/blocks/trending?size=8"))
                .andExpect(jsonPath("$.data.length()").value(8))
                .andExpect(jsonPath("$.data[0].recentPlays").doesNotExist());
        mvc.perform(get("/api/v1/playlists/trending?size=10"))
                .andExpect(jsonPath("$.data.length()").value(5));
    }

    @Test
    @DisplayName("샘플 계정으로는 로그인할 수 없고, 베타 손님·새 회원은 샘플 블록을 담고 샘플 조합을 한 번에 담을 수 있음")
    void sampleAccountLockedAndCombosCollectable() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
                        .content("{\"email\":\"%s\",\"password\":\"!\"}".formatted(SAMPLE_EMAIL)))
                .andExpect(status().is4xxClientError());

        mvc.perform(post("/api/v1/auth/beta-login"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.nickname").exists());

        String user = newUser().accessToken();
        String combos = json(mvc.perform(get("/api/v1/playlists/public?size=50")));
        Number comboId = ((List<Number>) JsonPath.read(combos, "$.data.content[?(@.title == '왁뿌 팅글 모음')].id")).getFirst();
        postJson("/api/v1/playlists/" + comboId + "/collect", "{}", user).andExpect(status().isOk());
        getWithToken("/api/v1/me/blocks", user)
                .andExpect(jsonPath("$.data[*].title", hasItem("왁스 부수기")));
    }

    @Test
    @DisplayName("관리자가 샘플을 숨기면 상점·요즘 뜨는 소리·추천 조합·베타 손님 첫 블록에서 빠지고, 이미 담은 사람은 그대로 들음")
    void hideSamples() throws Exception {
        // 이 DB에는 개발용 관리자가 없어서 새 회원을 관리자로
        String adminEmail = "boss-" + java.util.UUID.randomUUID() + "@test.com";
        postJson("/api/v1/auth/signup", "{\"email\":\"%s\",\"password\":\"password123\",\"nickname\":\"관리자\"}".formatted(adminEmail))
                .andExpect(status().isCreated());
        jdbc.update("UPDATE users SET role = 'ADMIN' WHERE email = ?", adminEmail);
        String admin = login(adminEmail, "password123").accessToken();
        getWithToken("/api/v1/admin/samples", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.blocks").value(20))
                .andExpect(jsonPath("$.data.listedBlocks").value(20))
                .andExpect(jsonPath("$.data.combos").value(5))
                .andExpect(jsonPath("$.data.publicCombos").value(5))
                .andExpect(jsonPath("$.data.visible").value(true));

        // 숨기기 전에 샘플 블록을 담아 둔 사람
        String fan = newUser().accessToken();
        Number blockId = ((List<Number>) JsonPath.read(json(mvc.perform(get("/api/v1/blocks?size=1"))), "$.data.content[*].id")).getFirst();
        collect(fan, blockId.longValue());

        try {
            putJson("/api/v1/admin/samples", "{\"visible\":false}", newUser().accessToken()).andExpect(status().isForbidden());
            putJson("/api/v1/admin/samples", "{\"visible\":false}", admin)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("샘플을 상점·추천 조합에서 숨겼어요."))
                    .andExpect(jsonPath("$.data.listedBlocks").value(0))
                    .andExpect(jsonPath("$.data.publicCombos").value(0))
                    .andExpect(jsonPath("$.data.visible").value(false));

            mvc.perform(get("/api/v1/blocks?size=50")).andExpect(jsonPath("$.data.pageInfo.totalElements").value(0));
            mvc.perform(get("/api/v1/blocks/trending?size=8")).andExpect(jsonPath("$.data.length()").value(0));
            mvc.perform(get("/api/v1/playlists/public?size=50")).andExpect(jsonPath("$.data.content.length()").value(0));
            // 베타 손님은 샘플을 받지 않음
            String guest = JsonPath.read(json(mvc.perform(post("/api/v1/auth/beta-login"))), "$.data.accessToken");
            getWithToken("/api/v1/me/blocks", guest).andExpect(jsonPath("$.data.length()").value(0));
            // 이미 담은 사람은 블록함에 그대로, 들을 수도 있음
            getWithToken("/api/v1/me/blocks", fan).andExpect(jsonPath("$.data[*].id", hasItem(blockId.intValue())));
            getWithToken("/api/v1/blocks/" + blockId, fan).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.fileUrl").isString());
            // 관리자 목록에는 그대로 보임
            getWithToken("/api/v1/admin/blocks?status=APPROVED&size=50", admin)
                    .andExpect(jsonPath("$.data.pageInfo.totalElements").value(20));
            // 샘플 SQL이 다시 돌아도 숨긴 그대로
            new ResourceDatabasePopulator(new ClassPathResource("db/samples/R__public_samples.sql")).execute(dataSource);
            getWithToken("/api/v1/admin/samples", admin).andExpect(jsonPath("$.data.visible").value(false));
        } finally {
            putJson("/api/v1/admin/samples", "{\"visible\":true}", admin)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.listedBlocks").value(20))
                    .andExpect(jsonPath("$.data.publicCombos").value(5));
        }
        mvc.perform(get("/api/v1/blocks?size=50")).andExpect(jsonPath("$.data.pageInfo.totalElements").value(20));
    }

    @Test
    @DisplayName("샘플 SQL을 다시 실행해도 두 번 들어가지 않고, 이미 있는 내 데이터는 건드리지 않음")
    void runTwiceSafely() {
        Map<String, Object> before = counts();
        new ResourceDatabasePopulator(new ClassPathResource("db/samples/R__public_samples.sql")).execute(dataSource);
        new ResourceDatabasePopulator(new ClassPathResource("db/samples/R__public_samples.sql")).execute(dataSource);
        assertThat(counts()).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Long.class, SAMPLE_EMAIL)).isEqualTo(1L);
    }

    private Map<String, Object> counts() {
        return jdbc.queryForMap("""
                SELECT (SELECT COUNT(*) FROM block b JOIN users u ON u.id = b.uploader_id WHERE u.email = 'samples@asmrblock.invalid') AS blocks,
                       (SELECT COUNT(*) FROM playlist p JOIN users u ON u.id = p.user_id WHERE u.email = 'samples@asmrblock.invalid') AS combos,
                       (SELECT COUNT(*) FROM playlist_block) AS pieces,
                       (SELECT COUNT(*) FROM playlist_layer) AS layers,
                       (SELECT COUNT(*) FROM block_tag) AS tags""");
    }
}
