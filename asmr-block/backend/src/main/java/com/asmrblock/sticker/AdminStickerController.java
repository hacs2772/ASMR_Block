package com.asmrblock.sticker;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.sticker.StickerDtos.StickerCreateRequest;
import com.asmrblock.sticker.StickerDtos.StickerOrderRequest;
import com.asmrblock.sticker.StickerDtos.StickerResponse;
import com.asmrblock.sticker.StickerDtos.StickerUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 관리자: 스티커 추가·이름·숨기기·순서 (SecurityConfig에서 ADMIN 권한 확인) */
@RestController
@RequestMapping("/api/v1/admin/stickers")
@RequiredArgsConstructor
public class AdminStickerController {

    private final StickerService stickerService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StickerResponse> create(@Valid @ModelAttribute StickerCreateRequest request) {
        return ApiResponse.ok("스티커를 추가했어요.", stickerService.create(request));
    }

    @PatchMapping("/{code}")
    public ApiResponse<StickerResponse> update(@PathVariable String code, @Valid @RequestBody StickerUpdateRequest request) {
        return ApiResponse.ok(stickerService.update(code, request));
    }

    @PutMapping("/order")
    public ApiResponse<List<StickerResponse>> reorder(@Valid @RequestBody StickerOrderRequest request) {
        return ApiResponse.ok(stickerService.reorder(request.codes()));
    }
}
