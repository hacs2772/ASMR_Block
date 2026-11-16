package com.asmrblock.report;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.ClientIp;
import com.asmrblock.report.ReportDtos.ReportRequest;
import com.asmrblock.report.ReportDtos.ReportTargetResponse;
import com.asmrblock.report.ReportDtos.ResolveRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 신고하기 (누구나) + 관리자 처리 (SecurityConfig에서 /api/v1/admin/** ADMIN 확인) */
@RestController
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/api/v1/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> report(@AuthenticationPrincipal Long userId, @Valid @RequestBody ReportRequest request,
                                    HttpServletRequest http) {
        boolean created = reportService.report(userId, ClientIp.of(http), request);
        return ApiResponse.message(created ? "신고를 받았어요. 관리자가 확인할게요." : "이미 신고했어요. 관리자가 확인할게요.");
    }

    @GetMapping("/api/v1/admin/reports")
    public ApiResponse<List<ReportTargetResponse>> targets(@RequestParam(defaultValue = "OPEN") String status) {
        return ApiResponse.ok(reportService.targets(status));
    }

    @PostMapping("/api/v1/admin/reports/resolve")
    public ApiResponse<Void> resolve(@Valid @RequestBody ResolveRequest request) {
        return ApiResponse.message(reportService.resolve(request));
    }
}
