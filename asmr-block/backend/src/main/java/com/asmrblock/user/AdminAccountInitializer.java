package com.asmrblock.user;

import com.asmrblock.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * 공개용(public) 관리자 계정 준비: app.admin.email·password(.env.public)가 있으면
 * 서버가 켜질 때 그 계정을 관리자로 만들거나, 이미 있으면 비밀번호를 그 값으로 맞춤.
 * → 개발용 테스트 계정(password123) 없이도 나만 아는 비밀번호로 관리자 페이지에 들어감.
 * 비밀번호를 바꾸고 싶으면 .env.public을 고치고 서버를 다시 켜면 됨
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    static final int MIN_PASSWORD_LENGTH = 10;
    static final String NICKNAME = "ASMR Block";

    private final AppProperties properties;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Admin admin = properties.admin();
        if (admin == null || !admin.configured()) {
            return;
        }
        if (admin.password().length() < MIN_PASSWORD_LENGTH || admin.password().equals("password123")) {
            throw new IllegalStateException("관리자 비밀번호(APP_ADMIN_PASSWORD)는 %d자 이상, 남이 알기 어려운 값으로 정해 주세요."
                    .formatted(MIN_PASSWORD_LENGTH));
        }
        String email = admin.email().trim().toLowerCase(Locale.ROOT);
        String hash = passwordEncoder.encode(admin.password());
        userMapper.findByEmail(email).ifPresentOrElse(
                user -> {
                    userMapper.updateAdminAccount(user.getId(), hash);
                    log.info("관리자 계정 비밀번호를 설정값으로 맞췄어요: {}", email);
                },
                () -> {
                    userMapper.insert(User.builder().email(email).password(hash).nickname(NICKNAME)
                            .language("ko").role(Role.ADMIN).build());
                    log.info("관리자 계정을 만들었어요: {}", email);
                });
    }
}
