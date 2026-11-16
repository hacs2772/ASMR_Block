package com.asmrblock.block;

import com.asmrblock.audio.AudioProcessingException;
import com.asmrblock.audio.AudioService;
import com.asmrblock.audio.AudioService.Trim;
import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockDtos.BlockUploadRequest;
import com.asmrblock.block.BlockDtos.UploadPolicyResponse;
import com.asmrblock.config.AppProperties;
import com.asmrblock.category.CategoryService;
import com.asmrblock.common.ApiException;
import com.asmrblock.sticker.StickerService;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 블록 올리기: 소리 파일 또는 영상 하나 (구간을 고르면 그 부분만) → 소리는 표준 형식으로(음량 -24 LUFS),
 * 영상이면 같은 구간을 480p·소리 없음으로 → 블록 등록(PENDING). 꾸미기(겉면 사진 · 스티커 + 무늬)도 함께.
 * 소리 따로 + 영상 따로는 받지 않음 (싱크가 어긋날 수 있어서). 관리자가 승인하면 목록에 노출됩니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlockUploadService {

    static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "webm");
    static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "mov", "m4v", "webm");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    static final int MIN_DURATION_SECONDS = 10;
    static final int MAX_DURATION_SECONDS = 20 * 60;
    static final int MAX_FILE_MB = 50;
    static final int MAX_IMAGE_MB = 10;

    private final AudioService audioService;
    private final StorageService storageService;
    private final CategoryService categoryService;
    private final StickerService stickerService;
    private final BlockMapper blockMapper;
    private final BlockService blockService;
    private final TransactionTemplate transactionTemplate;
    private final AppProperties properties;
    private final UploadDraftService draftService;

    /** 업로드 규칙 (판매 최대 가격, 파일 크기·길이, 형식) */
    public UploadPolicyResponse policy() {
        return new UploadPolicyResponse(properties.shop().sellerMaxPrice(), MAX_FILE_MB,
                MIN_DURATION_SECONDS, MAX_DURATION_SECONDS, ALLOWED_EXTENSIONS.stream().sorted().toList(),
                properties.upload().maxVideoMb(), VIDEO_EXTENSIONS.stream().sorted().toList(),
                MAX_IMAGE_MB, IMAGE_EXTENSIONS.stream().sorted().toList(),
                stickerService.activeCodes(), BlockDesign.PATTERNS);
    }

    public BlockResponse upload(Long uploaderId, BlockUploadRequest request) {
        validate(request);
        String stickers = stickerService.normalize(request.stickers());
        String pattern = BlockDesign.normalizePattern(request.pattern());
        // 소리는 하나에서만: 소리 파일 · 영상(소리는 영상에서) · 먼저 올려 둔 파일(구간 고르기, 소리나 영상)
        // 영상이면 소리와 화면을 같은 파일·같은 구간에서 만들어 싱크가 맞음
        UploadDraftService.Draft draft = hasText(request.draftId()) ? draftService.take(uploaderId, request.draftId()) : null;
        boolean hasVideo = present(request.video()) || (draft != null && draft.video());
        boolean hasAudio = !hasVideo;
        String extension = draft != null ? draft.extension()
                : present(request.file()) ? extensionOf(request.file().getOriginalFilename(), ALLOWED_EXTENSIONS)
                : extensionOf(request.video().getOriginalFilename(), VIDEO_EXTENSIONS);
        String id = UUID.randomUUID().toString();

        Path workDir = createTempDir();
        try {
            Path original = draft != null ? draft.file() : workDir.resolve("original." + extension);
            if (draft == null) {
                (present(request.file()) ? request.file() : request.video()).transferTo(original);
            }
            Trim trim = trimOf(request, original, draft);

            Path normalized = workDir.resolve("normalized.mp3");
            int duration;
            try {
                duration = audioService.normalize(original, normalized, trim);
            } catch (AudioProcessingException e) {
                log.info("업로드 음원 변환 실패: {}", e.getMessage());
                throw ApiException.badRequest(hasAudio ? "오디오 파일을 읽을 수 없습니다. 다른 파일로 시도해주세요."
                        : "영상에서 소리를 찾지 못했어요. 소리 파일을 같이 올려 주세요.");
            }
            if (duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
                throw ApiException.badRequest(("블록 길이는 %d초 ~ %d분 사이여야 합니다."
                        + (trim == null && duration > MAX_DURATION_SECONDS ? " 긴 녹음은 구간을 골라 올려 주세요." : ""))
                        .formatted(MIN_DURATION_SECONDS, MAX_DURATION_SECONDS / 60));
            }

            // 영상: 소리와 같은 구간을 480p · 소리 없음으로 줄여서 (원본 영상은 크기 때문에 보관하지 않음)
            String videoKey = null;
            if (hasVideo) {
                Path videoOut = workDir.resolve("video.mp4");
                try {
                    audioService.blockVideo(original, videoOut, trim);
                } catch (AudioProcessingException e) {
                    log.info("업로드 영상 변환 실패: {}", e.getMessage());
                    throw ApiException.badRequest("영상 파일을 읽을 수 없어요. 다른 파일로 시도해 주세요.");
                }
                videoKey = "videos/%s.mp4".formatted(id);
                storageService.store(videoKey, videoOut);
            }

            // 겉면 사진: 가로 640px jpg
            String coverKey = null;
            if (present(request.cover())) {
                Path coverIn = workDir.resolve("cover." + extensionOf(request.cover().getOriginalFilename(), IMAGE_EXTENSIONS));
                request.cover().transferTo(coverIn);
                Path coverOut = workDir.resolve("cover.jpg");
                try {
                    audioService.coverImage(coverIn, coverOut);
                } catch (AudioProcessingException e) {
                    throw ApiException.badRequest("사진 파일을 읽을 수 없어요. jpg나 png로 시도해 주세요.");
                }
                coverKey = "covers/%s.jpg".formatted(id);
                storageService.store(coverKey, coverOut);
            }

            String fileKey = "blocks/%s.mp3".formatted(id);
            // 음원 원본만 보관 (영상만 올렸으면 뽑아낸 소리가 원본). 구간을 골랐으면 그 부분만 (잘라 낸 부분은 보관하지 않음)
            String masterKey = hasAudio ? storeMaster(id, extension, original, trim, workDir) : null;
            storageService.store(fileKey, normalized);

            Block block = Block.builder()
                    .title(request.title().trim())
                    .description(request.description())
                    .fileKey(fileKey)
                    .masterFileKey(masterKey)
                    .thumbnailKey(coverKey)
                    .stickers(stickers)
                    .stickerPattern(pattern)
                    .videoKey(videoKey)
                    .duration(duration)
                    .price(request.price() == null ? 0 : request.price())
                    .talkType(request.talkType() == null ? TalkType.NONE : request.talkType())
                    .recordedPlace(blankToNull(request.recordedPlace()))
                    .categoryId(request.categoryId())
                    .uploaderId(uploaderId)
                    .license(request.license())
                    .sourceUrl(request.sourceUrl())
                    .attribution(request.attribution())
                    .status(BlockStatus.PENDING)
                    .build();

            transactionTemplate.executeWithoutResult(status -> {
                blockMapper.insert(block);
                if (request.tagIds() != null && !request.tagIds().isEmpty()) {
                    blockMapper.insertTags(block.getId(), Set.copyOf(request.tagIds()));
                }
            });
            if (draft != null) {
                draftService.discard(draft);
            }
            return blockService.toResponse(blockMapper.findById(block.getId()).orElseThrow(), uploaderId);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            FileSystemUtils.deleteRecursively(workDir.toFile());
        }
    }

    private void validate(BlockUploadRequest request) {
        boolean hasDraft = hasText(request.draftId());
        int sources = (present(request.file()) ? 1 : 0) + (present(request.video()) ? 1 : 0) + (hasDraft ? 1 : 0);
        if (sources == 0) {
            throw ApiException.badRequest("음원 파일이나 영상 파일 중 하나는 올려 주세요.");
        }
        if (sources > 1) {
            throw ApiException.badRequest("소리 파일이나 영상 중 하나만 올려 주세요. 영상이면 영상의 소리를 그대로 써요.");
        }
        if (request.trimStart() != null || request.trimEnd() != null) {
            if (request.trimStart() == null || request.trimEnd() == null) {
                throw ApiException.badRequest("구간은 시작과 끝을 같이 골라 주세요.");
            }
            double length = request.trimEnd() - request.trimStart();
            if (request.trimStart() < 0 || length <= 0) {
                throw ApiException.badRequest("구간의 시작이 끝보다 앞이어야 해요.");
            }
            if (length < MIN_DURATION_SECONDS || length > MAX_DURATION_SECONDS) {
                throw ApiException.badRequest("고른 구간은 %d초 ~ %d분 사이여야 해요."
                        .formatted(MIN_DURATION_SECONDS, MAX_DURATION_SECONDS / 60));
            }
        }
        if (present(request.file())) {
            extensionOf(request.file().getOriginalFilename(), ALLOWED_EXTENSIONS);
            checkSize(request.file(), MAX_FILE_MB, "음원");
        }
        if (present(request.video())) {
            extensionOf(request.video().getOriginalFilename(), VIDEO_EXTENSIONS);
            checkSize(request.video(), properties.upload().maxVideoMb(), "영상");
        }
        if (present(request.cover())) {
            extensionOf(request.cover().getOriginalFilename(), IMAGE_EXTENSIONS);
            checkSize(request.cover(), MAX_IMAGE_MB, "사진");
        }
        if (request.license() == License.CC_BY && (request.attribution() == null || request.attribution().isBlank())) {
            throw ApiException.badRequest("CC_BY 라이선스는 출처 표기(attribution)가 필요합니다.");
        }
        if (!categoryService.isLeafCategory(request.categoryId())) {
            throw ApiException.badRequest("소분류 카테고리를 골라주세요. (예: 탭핑·타건 > 탭핑)");
        }
        int maxPrice = properties.shop().sellerMaxPrice();
        if (request.price() != null && request.price() > maxPrice) {
            throw ApiException.badRequest("가격은 최대 %d코인까지 정할 수 있어요.".formatted(maxPrice));
        }
        if (request.tagIds() != null && !categoryService.allTagsExist(request.tagIds())) {
            throw ApiException.badRequest("없는 태그가 포함되어 있습니다.");
        }
    }

    /** 고른 구간 (끝은 파일 길이 안으로, 전체를 골랐으면 자르지 않음) */
    private Trim trimOf(BlockUploadRequest request, Path original, UploadDraftService.Draft draft) {
        if (request.trimStart() == null || request.trimEnd() == null) {
            return null;
        }
        double length;
        try {
            length = draft != null ? draft.duration() : audioService.exactDuration(original);
        } catch (AudioProcessingException e) {
            throw ApiException.badRequest("오디오 파일을 읽을 수 없습니다. 다른 파일로 시도해주세요.");
        }
        double end = Math.min(request.trimEnd(), length);
        if (request.trimStart() <= 0.05 && end >= length - 0.05) {
            return null; // 전체를 고른 것과 같음
        }
        if (end - request.trimStart() < MIN_DURATION_SECONDS) {
            throw ApiException.badRequest("고른 구간이 파일보다 길어요. 구간을 다시 골라 주세요.");
        }
        return new Trim(request.trimStart(), end);
    }

    /** 원본 보관. 구간을 골랐으면 다시 인코딩하지 않고 그 부분만 (못 자르는 형식이면 원본은 보관하지 않음) */
    private String storeMaster(String id, String extension, Path original, Trim trim, Path workDir) {
        String key = "masters/%s.%s".formatted(id, extension);
        if (trim == null) {
            storageService.store(key, original);
            return key;
        }
        Path cut = workDir.resolve("master." + extension);
        try {
            audioService.trimCopy(original, cut, trim);
            storageService.store(key, cut);
            return key;
        } catch (AudioProcessingException e) {
            log.info("원본 구간 자르기 실패 (원본 보관 안 함): {}", e.getMessage());
            return null;
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean present(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    static void checkSize(MultipartFile file, int maxMb, String what) {
        if (file.getSize() > maxMb * 1024L * 1024L) {
            throw ApiException.badRequest("%s 파일은 %dMB까지 올릴 수 있어요.".formatted(what, maxMb));
        }
    }

    static String extensionOf(String filename, Set<String> allowed) {
        String ext = filename == null || !filename.contains(".") ? ""
                : filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!allowed.contains(ext)) {
            throw ApiException.badRequest("지원하는 형식: " + String.join(", ", allowed.stream().sorted().toList()));
        }
        return ext;
    }

    private static Path createTempDir() {
        try {
            return Files.createTempDirectory("upload-");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
