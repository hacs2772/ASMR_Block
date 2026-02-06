package com.asmrblock.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistCreateRequest {
    
    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 100, message = "제목은 100자 이내여야 합니다.")
    private String title;
    
    private String description;
    
    private Boolean isPublic = false;
    
    @NotEmpty(message = "블록은 최소 1개 이상이어야 합니다.")
    private List<BlockItem> blocks;
    
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockItem {
        private Long blockId;
        private Integer sortOrder;
    }
}
