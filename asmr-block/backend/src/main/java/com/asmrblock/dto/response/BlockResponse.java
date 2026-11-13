package com.asmrblock.dto.response;

import com.asmrblock.domain.Block;
import com.asmrblock.storage.StorageService;
import com.asmrblock.domain.SoundCategory;
import com.asmrblock.domain.SoundTag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockResponse {
    
    private Long id;
    private String title;
    private String description;
    private String fileUrl;
    private String thumbnailUrl;
    private Integer duration;
    private Integer price;
    private String license;
    private String sourceUrl;
    private String attribution;
    private CategoryInfo category;
    private List<TagInfo> tags;
    private UploaderInfo uploader;
    private Integer playCount;
    private LocalDateTime createdAt;
    
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryInfo {
        private Long id;
        private String name;
        private String color;
    }
    
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TagInfo {
        private Long id;
        private String name;
    }
    
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploaderInfo {
        private Long id;
        private String nickname;
    }
    
    public static BlockResponse from(Block block, StorageService storage) {
        BlockResponseBuilder builder = BlockResponse.builder()
                .id(block.getId())
                .title(block.getTitle())
                .description(block.getDescription())
                .fileUrl(storage.publicUrl(block.getFileKey()))
                .thumbnailUrl(storage.publicUrl(block.getThumbnailKey()))
                .duration(block.getDuration())
                .price(block.getPrice())
                .license(block.getLicense())
                .sourceUrl(block.getSourceUrl())
                .attribution(block.getAttribution())
                .playCount(block.getPlayCount())
                .createdAt(block.getCreatedAt());
        
        if (block.getCategory() != null) {
            builder.category(CategoryInfo.builder()
                    .id(block.getCategory().getId())
                    .name(block.getCategory().getName())
                    .color(block.getCategory().getColor())
                    .build());
        }
        
        if (block.getUploader() != null) {
            builder.uploader(UploaderInfo.builder()
                    .id(block.getUploader().getId())
                    .nickname(block.getUploader().getNickname())
                    .build());
        }
        
        if (block.getTags() != null) {
            builder.tags(block.getTags().stream()
                    .map(tag -> TagInfo.builder()
                            .id(tag.getId())
                            .name(tag.getName())
                            .build())
                    .collect(Collectors.toList()));
        }
        
        return builder.build();
    }
}
