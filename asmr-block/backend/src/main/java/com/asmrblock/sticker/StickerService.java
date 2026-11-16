package com.asmrblock.sticker;

import com.asmrblock.audio.AudioProcessingException;
import com.asmrblock.audio.AudioService;
import com.asmrblock.block.BlockDesign;
import com.asmrblock.common.ApiException;
import com.asmrblock.sticker.StickerDtos.StickerCreateRequest;
import com.asmrblock.sticker.StickerDtos.StickerResponse;
import com.asmrblock.sticker.StickerDtos.StickerUpdateRequest;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 블록 겉면 스티커 (V8부터 DB). 앱·웹은 GET /stickers로 그림을 받아 그리므로
 * 관리자 페이지에서 추가하면 앱 업데이트 없이 바로 쓸 수 있음
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StickerService {

    static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "webp");
    static final int MAX_IMAGE_MB = 2;
    private static final String CODE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StickerMapper stickerMapper;
    private final StorageService storageService;
    private final AudioService audioService;

    @Transactional(readOnly = true)
    public List<StickerResponse> list() {
        return stickerMapper.findAll().stream().map(s -> StickerResponse.from(s, storageService)).toList();
    }

    /** 지금 고를 수 있는 스티커 코드 (업로드 규칙에 보냄) */
    @Transactional(readOnly = true)
    public List<String> activeCodes() {
        return stickerMapper.findActiveCodes();
    }

    /** "flagjp, signal,bird" → 검사 후 "flagjp,signal,bird" (비어 있으면 null). 숨긴 스티커는 새로 못 붙임 */
    @Transactional(readOnly = true)
    public String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        List<String> codes = Arrays.stream(raw.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT)).filter(s -> !s.isEmpty()).distinct().toList();
        if (codes.size() > BlockDesign.MAX_STICKERS) {
            throw ApiException.badRequest("스티커는 최대 %d개까지 붙일 수 있어요.".formatted(BlockDesign.MAX_STICKERS));
        }
        Set<String> allowed = new HashSet<>(stickerMapper.findActiveCodes());
        codes.stream().filter(c -> !allowed.contains(c)).findFirst().ifPresent(c -> {
            throw ApiException.badRequest("없는 스티커예요: " + c);
        });
        return codes.isEmpty() ? null : String.join(",", codes);
    }

    /** 관리자: 스티커 추가. SVG는 검사해서 글자로, 사진 파일은 256px PNG로 줄여서 저장 */
    @Transactional
    public StickerResponse create(StickerCreateRequest request) {
        MultipartFile file = request.file();
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("스티커 그림 파일(SVG 또는 PNG)을 골라 주세요.");
        }
        String extension = extensionOf(file.getOriginalFilename());
        String code = newCode();
        Sticker sticker = Sticker.builder().code(code).name(request.name().trim())
                .nameEn(request.nameEn() == null || request.nameEn().isBlank() ? null : request.nameEn().trim())
                .sortOrder(stickerMapper.nextSortOrder()).isActive(true).build();
        if (extension.equals("svg")) {
            sticker.setSvg(SvgCheck.clean(bytesOf(file)));
        } else if (IMAGE_EXTENSIONS.contains(extension)) {
            if (file.getSize() > MAX_IMAGE_MB * 1024L * 1024L) {
                throw ApiException.badRequest("그림 파일은 %dMB까지 올릴 수 있어요.".formatted(MAX_IMAGE_MB));
            }
            sticker.setImageKey(storeImage(file, extension, code));
        } else {
            throw ApiException.badRequest("스티커 그림은 SVG, PNG, JPG, WEBP 파일만 올릴 수 있어요.");
        }
        stickerMapper.insert(sticker);
        return StickerResponse.from(stickerMapper.findByCode(code), storageService);
    }

    @Transactional
    public StickerResponse update(String code, StickerUpdateRequest request) {
        find(code);
        String name = request.name() == null ? null : request.name().trim();
        if (name != null && name.isEmpty()) {
            throw ApiException.badRequest("스티커 이름을 적어 주세요.");
        }
        stickerMapper.update(code, name, request.nameEn() == null ? null : request.nameEn().trim(), request.active());
        return StickerResponse.from(find(code), storageService);
    }

    /** 관리자: 순서 바꾸기 (보낸 순서대로 1, 2, 3…, 안 보낸 스티커는 그 뒤) */
    @Transactional
    public List<StickerResponse> reorder(List<String> codes) {
        List<String> unique = codes.stream().distinct().toList();
        for (String code : unique) {
            find(code);
        }
        for (int i = 0; i < unique.size(); i++) {
            stickerMapper.updateSortOrder(unique.get(i), i + 1);
        }
        return list();
    }

    private Sticker find(String code) {
        Sticker sticker = code == null ? null : stickerMapper.findByCode(code);
        if (sticker == null) {
            throw ApiException.notFound("스티커를 찾을 수 없어요: " + code);
        }
        return sticker;
    }

    private String storeImage(MultipartFile file, String extension, String code) {
        Path dir = null;
        try {
            dir = Files.createTempDirectory("sticker-");
            Path in = dir.resolve("in." + extension);
            Path out = dir.resolve("sticker.png");
            file.transferTo(in);
            try {
                audioService.stickerImage(in, out);
            } catch (AudioProcessingException e) {
                log.info("스티커 그림 변환 실패: {}", e.getMessage());
                throw ApiException.badRequest("그림 파일을 읽을 수 없어요. 다른 PNG로 시도해 주세요.");
            }
            String key = "stickers/%s.png".formatted(code);
            storageService.store(key, out);
            return key;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            deleteQuietly(dir);
        }
    }

    private String newCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder code = new StringBuilder("s");
            for (int i = 0; i < 6; i++) {
                code.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            if (!stickerMapper.exists(code.toString())) {
                return code.toString();
            }
        }
        throw new IllegalStateException("스티커 코드를 만들지 못했어요");
    }

    private static String extensionOf(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private static byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void deleteQuietly(Path dir) {
        if (dir == null) {
            return;
        }
        try (var paths = Files.walk(dir)) {
            paths.sorted(java.util.Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        } catch (IOException ignored) {
            // 임시 폴더 정리 실패는 무시
        }
    }
}
