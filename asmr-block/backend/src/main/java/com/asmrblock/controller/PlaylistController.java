package com.asmrblock.controller;

import com.asmrblock.domain.Playlist;
import com.asmrblock.domain.PlaylistBlock;
import com.asmrblock.dto.request.PlaylistCreateRequest;
import com.asmrblock.dto.response.ApiResponse;
import com.asmrblock.dto.response.PageResponse;
import com.asmrblock.service.PlaylistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/playlists")
@RequiredArgsConstructor
public class PlaylistController {
    
    private final PlaylistService playlistService;
    
    // 내 플레이리스트 목록 조회
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getMyPlaylists(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Long userId = (Long) auth.getPrincipal();
        List<Playlist> playlists = playlistService.getMyPlaylists(userId, page, size);
        long totalElements = playlistService.countMyPlaylists(userId);
        
        List<Map<String, Object>> content = playlists.stream()
                .map(this::toPlaylistSummary)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(
            PageResponse.of(content, page, size, totalElements)));
    }
    
    // 플레이리스트 상세 조회
    @GetMapping("/{playlistId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlaylist(
            Authentication auth,
            @PathVariable Long playlistId) {
        
        Long userId = auth != null ? (Long) auth.getPrincipal() : null;
        Playlist playlist = playlistService.getPlaylist(playlistId, userId);
        
        return ResponseEntity.ok(ApiResponse.success(toPlaylistDetail(playlist)));
    }
    
    // 플레이리스트 생성
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createPlaylist(
            Authentication auth,
            @Valid @RequestBody PlaylistCreateRequest request) {
        
        Long userId = (Long) auth.getPrincipal();
        Playlist playlist = playlistService.createPlaylist(userId, request);
        
        Map<String, Object> data = Map.of(
            "id", playlist.getId(),
            "title", playlist.getTitle(),
            "totalDuration", playlist.getTotalDuration(),
            "blockCount", request.getBlocks().size()
        );
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("플레이리스트가 생성되었습니다.", data));
    }
    
    // 플레이리스트 수정
    @PutMapping("/{playlistId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePlaylist(
            Authentication auth,
            @PathVariable Long playlistId,
            @Valid @RequestBody PlaylistCreateRequest request) {
        
        Long userId = (Long) auth.getPrincipal();
        Playlist playlist = playlistService.updatePlaylist(playlistId, userId, request);
        
        Map<String, Object> data = Map.of(
            "id", playlist.getId(),
            "title", playlist.getTitle(),
            "totalDuration", playlist.getTotalDuration(),
            "blockCount", request.getBlocks().size()
        );
        
        return ResponseEntity.ok(ApiResponse.success("플레이리스트가 수정되었습니다.", data));
    }
    
    // 플레이리스트 삭제
    @DeleteMapping("/{playlistId}")
    public ResponseEntity<ApiResponse<Void>> deletePlaylist(
            Authentication auth,
            @PathVariable Long playlistId) {
        
        Long userId = (Long) auth.getPrincipal();
        playlistService.deletePlaylist(playlistId, userId);
        
        return ResponseEntity.ok(ApiResponse.success("플레이리스트가 삭제되었습니다."));
    }
    
    // 재생 횟수 증가
    @PostMapping("/{playlistId}/play")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> incrementPlayCount(
            @PathVariable Long playlistId) {
        int playCount = playlistService.incrementPlayCount(playlistId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("playCount", playCount)));
    }
    
    // 플레이리스트 요약 정보 변환
    private Map<String, Object> toPlaylistSummary(Playlist playlist) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", playlist.getId());
        map.put("title", playlist.getTitle());
        map.put("description", playlist.getDescription());
        map.put("totalDuration", playlist.getTotalDuration());
        map.put("blockCount", playlist.getBlocks() != null ? playlist.getBlocks().size() : 0);
        map.put("isPublic", playlist.getIsPublic());
        map.put("playCount", playlist.getPlayCount());
        map.put("createdAt", playlist.getCreatedAt());
        
        // 미리보기용 블록 색상 (처음 3개)
        if (playlist.getBlocks() != null) {
            List<Map<String, Object>> previewBlocks = playlist.getBlocks().stream()
                    .limit(3)
                    .map(pb -> {
                        Map<String, Object> block = new HashMap<>();
                        block.put("id", pb.getBlockId());
                        if (pb.getBlock() != null && pb.getBlock().getCategory() != null) {
                            block.put("color", pb.getBlock().getCategory().getColor());
                        }
                        return block;
                    })
                    .collect(Collectors.toList());
            map.put("previewBlocks", previewBlocks);
        }
        
        return map;
    }
    
    // 플레이리스트 상세 정보 변환
    private Map<String, Object> toPlaylistDetail(Playlist playlist) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", playlist.getId());
        map.put("title", playlist.getTitle());
        map.put("description", playlist.getDescription());
        map.put("totalDuration", playlist.getTotalDuration());
        map.put("isPublic", playlist.getIsPublic());
        map.put("playCount", playlist.getPlayCount());
        map.put("createdAt", playlist.getCreatedAt());
        map.put("updatedAt", playlist.getUpdatedAt());
        
        // 블록 상세 정보
        if (playlist.getBlocks() != null) {
            List<Map<String, Object>> blocks = playlist.getBlocks().stream()
                    .map(this::toPlaylistBlockDetail)
                    .collect(Collectors.toList());
            map.put("blocks", blocks);
        }
        
        return map;
    }
    
    // 플레이리스트 블록 상세 정보 변환
    private Map<String, Object> toPlaylistBlockDetail(PlaylistBlock pb) {
        Map<String, Object> map = new HashMap<>();
        map.put("playlistBlockId", pb.getId());
        map.put("sortOrder", pb.getSortOrder());
        
        if (pb.getBlock() != null) {
            Map<String, Object> block = new HashMap<>();
            block.put("id", pb.getBlock().getId());
            block.put("title", pb.getBlock().getTitle());
            block.put("fileUrl", pb.getBlock().getFileUrl());
            block.put("duration", pb.getBlock().getDuration());
            
            if (pb.getBlock().getCategory() != null) {
                Map<String, Object> category = new HashMap<>();
                category.put("id", pb.getBlock().getCategory().getId());
                category.put("name", pb.getBlock().getCategory().getName());
                category.put("color", pb.getBlock().getCategory().getColor());
                block.put("category", category);
            }
            
            map.put("block", block);
        }
        
        return map;
    }
}
