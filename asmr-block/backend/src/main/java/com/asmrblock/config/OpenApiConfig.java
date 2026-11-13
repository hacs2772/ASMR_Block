package com.asmrblock.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI (http://localhost:8080/swagger-ui.html) 설정.
 * 로그인 API로 받은 accessToken을 오른쪽 위 [Authorize] 버튼에 붙여넣으면
 * 로그인이 필요한 API도 화면에서 바로 호출해볼 수 있습니다.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info().title("ASMR Block API").version("v1")
                        .description("나만의 ASMR을 블록처럼 조합하세요"))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
