package com.brentversal.passwordless.frontDto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 등록(QR) 화면에 내려줄 정보
@Getter
@AllArgsConstructor
public class RegisterInfoDto {
    private String qrDataUrl;       // QR 이미지 데이터(Base64 Data URL)
    private String serverUrl;       // 인증서버 URL (앱이 접속할 주소)
    private String registerKey;     // 등록 키
}
