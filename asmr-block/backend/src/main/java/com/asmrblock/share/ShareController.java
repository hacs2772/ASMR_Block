package com.asmrblock.share;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * 공유 링크: /s/{id} = 조합 미리보기 카드용 작은 페이지(사람은 바로 듣기 화면으로), /s/{id}/card.png = 카드 그림,
 * /s/b/{id} = 블록, /s/c/{id} = 크리에이터.
 * 화면(HTML·그림)이라 ApiResponse로 감싸지 않음. 웹 nginx가 /s/ 를 백엔드로 넘김
 */
@RestController
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    @GetMapping(value = "/s/{playlistId}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> page(@PathVariable Long playlistId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
                .body(shareService.page(playlistId));
    }

    @GetMapping(value = "/s/{playlistId}/card.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> card(@PathVariable Long playlistId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(shareService.card(playlistId));
    }

    /** 블록 공유: 누르면 크리에이터 페이지에서 그 블록이 맨 위에 */
    @GetMapping(value = "/s/b/{blockId}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> blockPage(@PathVariable Long blockId) {
        return html(shareService.blockPage(blockId));
    }

    @GetMapping(value = "/s/b/{blockId}/card.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> blockCard(@PathVariable Long blockId) {
        return png(shareService.blockCard(blockId));
    }

    /** 크리에이터 페이지 공유 */
    @GetMapping(value = "/s/c/{userId}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> creatorPage(@PathVariable Long userId) {
        return html(shareService.creatorPage(userId));
    }

    @GetMapping(value = "/s/c/{userId}/card.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> creatorCard(@PathVariable Long userId) {
        return png(shareService.creatorCard(userId));
    }

    private static ResponseEntity<String> html(String body) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic()).body(body);
    }

    private static ResponseEntity<byte[]> png(byte[] body) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic()).body(body);
    }
}
