package com.brentversal.passwordless.client;

import com.brentversal.passwordless.config.PasswordlessProperties;
import com.brentversal.passwordless.dto.PasswordlessResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class PasswordlessClient {

    // PasswordlessClientConfig에서 만든 요청용 WebClient
    private final WebClient passwordlessWebClient;
    private final PasswordlessProperties props;

    // 공통 POST 호출 (form-urlencoded). 인증서버 API는 전부 이 형태의 POST 요청임
    private PasswordlessResponse post (String path, MultiValueMap<String, String> form) {
        return passwordlessWebClient.post()
                .uri("/ap/rest/auth/" + path)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(BodyInserters.fromFormData(form))
                .retrieve()
                .bodyToMono(PasswordlessResponse.class)
                .block();
    }

    private MultiValueMap<String, String> formWithUserId(String userId){
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("userId", userId);
        return form;
    }

    // --- isAp : 등록 여부 확인 ---
    public boolean isRegistered(String userId){
        MultiValueMap<String, String> form = formWithUserId(userId);
        PasswordlessResponse res = post("isAp", form);
        return res != null && res.isResult()
                && res.getData() != null
                && res.getData().path("exist").asBoolean(false);
    }

    // --- joinAp : 등록 정보(QR 등) 요청 ---
    public PasswordlessResponse joinAp(String userId, String name, String email){
        MultiValueMap<String, String> form = formWithUserId(userId);
        if (name != null) form.add("name", name);
        if (email != null) form.add("email", email);
        return post("joinAp", form);
    }

    // --- getTokenForOneTime : 암호화 토큰 요청 → 복호화해서 반환 (getSp에 쓰일 일회용 토큰) ---
    public String getDecryptedToken(String userId){
        MultiValueMap<String, String> form = formWithUserId(userId);
        PasswordlessResponse res = post("getTokenForOneTime", form);
        if (res == null || !res.isResult() || res.getData() == null){
            throw new IllegalStateException("일회용 토큰 요청 실패");
        }
        String encrypted = res.getData().path("token").asText();
        return decryptAes(encrypted);
    }

    // --- getSp : 자동패스워드 생성(인증 시작) ---
    public PasswordlessResponse getSp(String token, String userId, String random, String sessionId, String clientIp){
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("token", token);
        form.add("userId", userId);
        form.add("random", random);
        form.add("sessionId", sessionId);
        if (clientIp != null) form.add("clientIp", clientIp);
        return post("getSp", form);
    }

    // --- result : 모바일 승인 여부 폴링 ---
    public PasswordlessResponse result(String userId, String sessionId){
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("sessionId", sessionId);
        return post("result", form);
    }

    // --- cancel : 인증 취소 ---
    public PasswordlessResponse cancel(String userId, String sessionId){
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("sessionId", sessionId);
        return post("cancel", form);
    }

    // --- withdrawalAp : 해지 ---
    public boolean withdrawal(String userId){
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        PasswordlessResponse res = post("withdrawalAp", form);
        return res != null && res.isResult();
    }

    // ===== AES-128-CBC 복호화 (key == iv, serverKey 16바이트 사용) =====
    private String decryptAes(String base64Cipher){
        try {
            byte[] keyBytes = props.getServerKey().getBytes(StandardCharsets.UTF_8);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
            IvParameterSpec ivSPec = new IvParameterSpec(keyBytes);

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSPec);

            String fixed = base64Cipher.replace('-', '+').replace('_', '/');
            byte[] decoded = Base64.getDecoder().decode(fixed);
            byte[] plain = cipher.doFinal(decoded);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("일회용 토큰 복호화 실패", e);
        }
    }
}
