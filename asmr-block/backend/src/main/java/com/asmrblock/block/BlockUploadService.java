package com.asmrblock.block;

import com.asmrblock.audio.AudioProcessingException;
import com.asmrblock.audio.AudioService;
import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockDtos.BlockUploadRequest;
import com.asmrblock.block.BlockDtos.UploadPolicyResponse;
import com.asmrblock.config.AppProperties;
import com.asmrblock.category.CategoryService;
import com.asmrblock.common.ApiException;
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
 * 블록 올리기: 음원(또는 영상의 소리) → 표준 형식으로 변환(음량 -24 LUFS) → 블록 등록(PENDING).
 * 꾸미기(겉면 사진 · 스티커 + 무늬)와 같이 보는 영상(480p, 소리 없음)도 함께. 관리자가 승인하면 목록에 노출됩니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlockUploadService {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "webm");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "mov", "m4v", "webm");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    static final int MIN_DURATION_SECONDS = 10;
    static final int MAX_DURATION_SECONDS = 20 * 60;
    static final int MAX_FILE_MB = 50;
    static final int MAX_VIDEO_MB = 200;
    static final int MAX_IMAGE_MB = 10;

    private final AudioService audioService;
    private final StorageService storageService;
    private final CategoryService categoryService;
    private final BlockMapper blockMapper;
    private final BlockService blockService;
    private final TransactionTemplate transactionTemplate;
    private final AppProperties properties;

    /** 업로드 규칙 (판매 최대 가격, 파일 크기·길이, 형식) */
    public UploadPolicyResponse policy() {
        return new UploadPolicyResponse(properties.shop().sellerMaxPrice(), MAX_FILE_MB,
                MIN_DURATION_SECONDS, MAX_DURATION_SECONDS, ALLOWED_EXTENSIONS.stream().sorted().toList(),
                MAX_VIDEO_MB, VIDEO_EXTENSIONS.stream().sorted().toList(),
                MAX_IMAGE_MB, IMAGE_EXTENSIONS.stream().sorted().toList(),
                BlockDesign.STICKERS, BlockDesign.PATTERNS);
    }

    public BlockResponse upload(Long uploaderId, BlockUploadRequest request) {
        validate(request);
        String stickers = BlockDesign.normalizeStickers(request.stickers());
        String pattern = BlockDesign.normalizePattern(request.pattern());
        boolean hasAudio = present(request.file());
        boolean hasVideo = present(request.video());
        // 소리는 음원 파일에서, 없으면 영상의 소리에서
        MultipartFile source = hasAudio ? request.file() : request.video();
        String extension = hasAudio ? extensionOf(source.getOriginalFilename(), ALLOWED_EXTENSIONS)
                : extensionOf(source.getOriginalFilename(), VIDEO_EXTENSIONS);
        String id = UUID.randomUUID().toString();

        Path workDir = createTempDir();
        try {
            Path original = workDir.resolve("original." + extension);
            source.transferTo(original);

            Path normalized = workDir.resolve("normalized.mp3");
            int duration;
            try {
                duration = audioService.normalize(original, normalized);
            } catch (AudioProcessingException e) {
                log.info("업로드 음원 변환 실패: {}", e.getMessage());
                throw ApiException.badRequest(hasAudio ? "오디오 파일을 읽을 수 없습니다. 다른 파일로 시도해주세요."
                        : "영상에서 소리를 찾지 못했어요. 소리 파일을 같이 올려 주세요.");
            }
            if (duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
                throw ApiException.badRequest("블록 길이는 %d초 ~ %d분 사이여야 합니다."
                        .formatted(MIN_DURATION_SECONDS, MAX_DURATION_SECONDS / 60));
            }

            // 영상: 480p · 소리 없음으로 줄여서 (원본 영상은 크기 때문에 보관하지 않음)
            String videoKey = null;
            if (hasVideo) {
                Path videoIn = hasAudio ? workDir.resolve("video." + extensionOf(request.video().getOriginalFilename(), VIDEO_EXTENSIONS)) : original;
                if (hasAudio) {
                    request.video().transferTo(videoIn);
                }
                Path videoOut = workDir.resolve("video.mp4");
                try {
                    audioService.blockVideo(videoIn, videoOut);
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
            // 음원 원본만 보관 (영상만 올렸으면 뽑아낸 소리가 원본)
            String masterKey = hasAudio ? "masters/%s.%s".formatted(id, extension) : null;
            if (masterKey != null) {
                storageService.store(masterKey, original);
            }
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
            return blockService.toResponse(blockMapper.findById(block.getId()).orElseThrow(), uploaderId);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            FileSystemUtils.deleteRecursively(workDir.toFile());
        }
    }

    private void validate(BlockUploadRequest request) {
        if (!present(request.file()) && !present(request.video())) {
            throw ApiException.badRequest("음원 파일이나 영상 파일 중 하나는 올려 주세요.");
        }
        if (present(request.file())) {
            extensionOf(request.file().getOriginalFilename(), ALLOWED_EXTENSIONS);
            checkSize(request.file(), MAX_FILE_MB, "음원");
        }
        if (present(request.video())) {
            extensionOf(request.video().getOriginalFilename(), VIDEO_EXTENSIONS);
            checkSize(request.video(), MAX_VIDEO_MB, "영상");
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

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean present(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private static void checkSize(MultipartFile file, int maxMb, String what) {
        if (file.getSize() > maxMb * 1024L * 1024L) {
            throw ApiException.badRequest("%s 파일은 %dMB까지 올릴 수 있어요.".formatted(what, maxMb));
        }
    }

    private static String extensionOf(String filename, Set<String> allowed) {
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
