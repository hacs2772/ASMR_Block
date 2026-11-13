package com.asmrblock.block;

import com.asmrblock.audio.AudioProcessingException;
import com.asmrblock.audio.AudioService;
import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockDtos.BlockUploadRequest;
import com.asmrblock.category.CategoryService;
import com.asmrblock.common.ApiException;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 음원 업로드: 원본 보관 → 표준 형식으로 변환(음량 -24 LUFS) → 블록 등록(PENDING).
 * 관리자가 승인하면 목록에 노출됩니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlockUploadService {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "webm");
    static final int MIN_DURATION_SECONDS = 10;
    static final int MAX_DURATION_SECONDS = 20 * 60;

    private final AudioService audioService;
    private final StorageService storageService;
    private final CategoryService categoryService;
    private final BlockMapper blockMapper;
    private final BlockService blockService;
    private final TransactionTemplate transactionTemplate;

    public BlockResponse upload(Long uploaderId, BlockUploadRequest request) {
        validate(request);
        String extension = extensionOf(request.file().getOriginalFilename());
        String id = UUID.randomUUID().toString();

        Path workDir = createTempDir();
        try {
            Path original = workDir.resolve("original." + extension);
            request.file().transferTo(original);

            Path normalized = workDir.resolve("normalized.mp3");
            int duration;
            try {
                duration = audioService.normalize(original, normalized);
            } catch (AudioProcessingException e) {
                log.info("업로드 음원 변환 실패: {}", e.getMessage());
                throw ApiException.badRequest("오디오 파일을 읽을 수 없습니다. 다른 파일로 시도해주세요.");
            }
            if (duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
                throw ApiException.badRequest("블록 길이는 %d초 ~ %d분 사이여야 합니다."
                        .formatted(MIN_DURATION_SECONDS, MAX_DURATION_SECONDS / 60));
            }

            String masterKey = "masters/%s.%s".formatted(id, extension);
            String fileKey = "blocks/%s.mp3".formatted(id);
            storageService.store(masterKey, original);
            storageService.store(fileKey, normalized);

            Block block = Block.builder()
                    .title(request.title().trim())
                    .description(request.description())
                    .fileKey(fileKey)
                    .masterFileKey(masterKey)
                    .duration(duration)
                    .price(0)
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
            return blockService.toResponse(blockMapper.findById(block.getId()).orElseThrow());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            FileSystemUtils.deleteRecursively(workDir.toFile());
        }
    }

    private void validate(BlockUploadRequest request) {
        if (request.file().isEmpty()) {
            throw ApiException.badRequest("빈 파일입니다.");
        }
        extensionOf(request.file().getOriginalFilename());
        if (request.license() == License.CC_BY && (request.attribution() == null || request.attribution().isBlank())) {
            throw ApiException.badRequest("CC_BY 라이선스는 출처 표기(attribution)가 필요합니다.");
        }
        if (!categoryService.isLeafCategory(request.categoryId())) {
            throw ApiException.badRequest("소분류 카테고리를 골라주세요. (예: 자연 > 비·물)");
        }
        if (request.tagIds() != null && !categoryService.allTagsExist(request.tagIds())) {
            throw ApiException.badRequest("없는 태그가 포함되어 있습니다.");
        }
    }

    private static String extensionOf(String filename) {
        String ext = filename == null || !filename.contains(".") ? ""
                : filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw ApiException.badRequest("지원하는 형식: " + String.join(", ", List.copyOf(ALLOWED_EXTENSIONS)));
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
