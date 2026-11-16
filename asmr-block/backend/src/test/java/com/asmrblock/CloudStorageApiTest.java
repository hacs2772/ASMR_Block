package com.asmrblock;

import com.asmrblock.support.FakeS3Server;
import com.asmrblock.support.IntegrationTest;
import com.asmrblock.support.TestAudio;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 클라우드 저장소(app.storage.type=s3)로 서버 전체를 켜서: 올린 블록·미리듣기·완성본이 버킷에 들어가고,
 * 앱·웹이 받는 주소는 버킷 공개 주소, ffmpeg는 클라우드에서 받아서 씀, 옛 파일은 켜진 뒤 저절로 옮겨짐
 */
class CloudStorageApiTest extends IntegrationTest {

    private static final FakeS3Server S3;
    private static final Path LEGACY;
    private static final Path CACHE;

    static {
        try {
            S3 = new FakeS3Server("asmr-cloud-test");
            Path root = Files.createTempDirectory("cloud-storage-test-");
            LEGACY = root.resolve("legacy");
            CACHE = root.resolve("cache");
            Files.createDirectories(LEGACY.resolve("blocks"));
            Files.write(LEGACY.resolve("blocks/legacy-old.mp3"), TestAudio.sineMp3(3, 500));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void cloud(DynamicPropertyRegistry registry) {
        registry.add("app.storage.type", () -> "s3");
        registry.add("app.storage.local-dir", LEGACY::toString);
        registry.add("app.storage.s3.endpoint", S3::endpoint);
        registry.add("app.storage.s3.bucket", () -> "asmr-cloud-test");
        registry.add("app.storage.s3.access-key", () -> "test-key");
        registry.add("app.storage.s3.secret-key", () -> "test-secret");
        registry.add("app.storage.s3.public-base-url", S3::publicUrl);
        registry.add("app.storage.s3.cache-dir", CACHE::toString);
    }

    private static int httpGet(String url) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url)).build(),
                HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @Test
    @DisplayName("유료 블록 올리기 → 승인 → 소리·원본·미리듣기가 버킷에, 주소는 버킷 공개 주소로 받아짐 → 받아 둔 것을 지워도 완성본은 클라우드에서 받아 만들어짐")
    void uploadPreviewRender() throws Exception {
        String creator = newUser().accessToken();
        long block = idOf(upload(creator, TestAudio.sineMp3(12, 700), "tone.mp3", "클라우드 톤", 10)
                .andExpect(status().isCreated()));
        patchJson("/api/v1/admin/blocks/" + block + "/status", "{\"status\":\"APPROVED\"}", admin().accessToken())
                .andExpect(status().isOk());

        String detail = json(getWithToken("/api/v1/blocks/" + block, creator));
        String fileUrl = JsonPath.read(detail, "$.data.fileUrl");
        String previewUrl = JsonPath.read(detail, "$.data.previewUrl");
        assertThat(fileUrl).startsWith(S3.publicUrl() + "/blocks/");
        assertThat(previewUrl).startsWith(S3.publicUrl() + "/previews/");
        assertThat(httpGet(fileUrl)).isEqualTo(200);
        assertThat(httpGet(previewUrl)).isEqualTo(200);
        assertThat(S3.objects().keySet()).anyMatch(k -> k.startsWith("masters/"));
        assertThat(S3.objects().get(fileUrl.substring(S3.publicUrl().length() + 1)).contentType()).isEqualTo("audio/mpeg");

        // 서버에 받아 둔 블록 소리를 지워도 → ffmpeg가 쓸 때 클라우드에서 다시 받음
        FileSystemUtils.deleteRecursively(CACHE);
        long playlist = idOf(postJson("/api/v1/playlists", """
                {"title":"클라우드 조합","isPublic":true,"main":{"items":[{"blockId":%d,"repeat":2}]}}
                """.formatted(block), creator).andExpect(status().isCreated()));
        postJson("/api/v1/playlists/" + playlist + "/render", "", creator).andExpect(status().isOk());
        String done = null;
        long deadline = System.currentTimeMillis() + 60_000;
        while (System.currentTimeMillis() < deadline) {
            done = json(mvc.perform(get("/api/v1/playlists/" + playlist + "/render")));
            String st = JsonPath.read(done, "$.data.status");
            if (st.equals("DONE") || st.equals("FAILED")) {
                break;
            }
            Thread.sleep(300);
        }
        assertThat((String) JsonPath.read(done, "$.data.status")).isEqualTo("DONE");
        String renderUrl = JsonPath.read(done, "$.data.fileUrl");
        assertThat(renderUrl).startsWith(S3.publicUrl() + "/renders/");
        assertThat(httpGet(renderUrl)).isEqualTo(200);

        getWithToken("/api/v1/admin/stats", admin().accessToken())
                .andExpect(jsonPath("$.data.storage.type").value("s3"))
                .andExpect(jsonPath("$.data.storage.bucket").value("asmr-cloud-test"));
    }

    @Test
    @DisplayName("옛 파일(local-dir)은 켜진 뒤 뒤에서 저절로 클라우드로 옮겨짐 (관리자 통계에 옮긴 수)")
    void legacyMigrates() throws Exception {
        String admin = admin().accessToken();
        long deadline = System.currentTimeMillis() + 20_000;
        String stats = null;
        while (System.currentTimeMillis() < deadline) {
            stats = json(getWithToken("/api/v1/admin/stats", admin));
            if (((Number) JsonPath.read(stats, "$.data.storage.pending")).intValue() == 0
                    && !(Boolean) JsonPath.read(stats, "$.data.storage.running")) {
                break;
            }
            Thread.sleep(200);
        }
        assertThat(((Number) JsonPath.read(stats, "$.data.storage.pending")).intValue()).isZero();
        assertThat(((Number) JsonPath.read(stats, "$.data.storage.done")).intValue()).isGreaterThanOrEqualTo(1);
        assertThat(S3.objects()).containsKey("blocks/legacy-old.mp3");
    }
}
