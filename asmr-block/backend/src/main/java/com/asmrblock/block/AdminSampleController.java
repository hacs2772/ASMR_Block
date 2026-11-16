package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.SampleStatusResponse;
import com.asmrblock.block.BlockDtos.SampleVisibilityRequest;
import com.asmrblock.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관리자: 샘플 블록·샘플 조합 한꺼번에 숨기기/다시 보이기 (SecurityConfig에서 ADMIN 확인) */
@RestController
@RequestMapping("/api/v1/admin/samples")
@RequiredArgsConstructor
public class AdminSampleController {

    private final SampleService sampleService;

    @GetMapping
    public ApiResponse<SampleStatusResponse> status() {
        return ApiResponse.ok(sampleService.status());
    }

    @PutMapping
    public ApiResponse<SampleStatusResponse> setVisible(@Valid @RequestBody SampleVisibilityRequest request) {
        return ApiResponse.ok(request.visible() ? "샘플을 다시 보이게 했어요." : "샘플을 상점·추천 조합에서 숨겼어요.",
                sampleService.setVisible(request.visible()));
    }
}
