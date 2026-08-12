package com.brentversal.passwordless.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "passwordless")
public class PasswordlessProperties {
    private String authServerUrl;
    private String corpId;
    private String serverId;
    // AES(암호화 알고리즘) 복호화(<->암호화) + 요청 검증용 비밀키
    private String serverKey;
}
