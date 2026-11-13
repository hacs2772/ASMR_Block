package com.asmrblock.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** 완성본 만들기(ffmpeg)는 오래 걸리므로 별도 작업 스레드에서 처리 */
@Configuration
public class AsyncConfig {

    public static final String RENDER_EXECUTOR = "renderExecutor";

    @Bean(name = RENDER_EXECUTOR)
    public ThreadPoolTaskExecutor renderExecutor(AppProperties properties) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(properties.render().maxConcurrent());
        executor.setMaxPoolSize(properties.render().maxConcurrent());
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("render-");
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.initialize();
        return executor;
    }
}
