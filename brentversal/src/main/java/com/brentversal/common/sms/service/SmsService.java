package com.brentversal.common.sms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

// NHN 클라우드 SENS(Simple & Easy Notification Service)로 SMS를 발송한다.
// 전화번호 인증(이메일 찾기 등)에서 공통으로 재사용하려고 common 아래에 둔다(FileService의 S3 연동과 같은 위치 구조).
//
// SENS 키(sens.access-key 등)가 비어 있으면 실제 발송 대신 로그만 남긴다.
// 로컬 개발 중 키를 아직 안 채워도 인증번호 발급 자체는 막히지 않도록 하기 위함이다.
@Slf4j
@Service
public class SmsService {

    @Value("${sens.service-id:}")
    private String serviceId;

    @Value("${sens.access-key:}")
    private String accessKey;

    @Value("${sens.secret-key:}")
    private String secretKey;

    @Value("${sens.sender-phone:}")
    private String senderPhone;

    private static final String BASE_URL = "https://sens.apigw.ntruss.com";
    private static final String HTTP_METHOD = "POST";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void send(String toPhone, String content) {
        if (accessKey == null || accessKey.isBlank()) {
            log.info("[SMS 미발송 - SENS 키 없음] to={}, content={}", toPhone, content);
            return;
        }

        String uri = "/sms/v2/services/" + serviceId + "/messages";
        long timestamp = System.currentTimeMillis();

        try {
            String signature = makeSignature(uri, timestamp);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-ncp-apigw-timestamp", String.valueOf(timestamp));
            headers.set("x-ncp-iam-access-key", accessKey);
            headers.set("x-ncp-apigw-signature-v2", signature);

            // 전화번호는 하이픈 없이 보내야 하는 SENS 규격에 맞춘다.
            Map<String, Object> body = Map.of(
                    "type", "SMS",
                    "from", senderPhone.replace("-", ""),
                    "content", content,
                    "messages", List.of(Map.of("to", toPhone.replace("-", "")))
            );

            HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
            restTemplate.postForEntity(BASE_URL + uri, request, String.class);
            log.debug("SMS 발송 완료: to={}", toPhone);
        } catch (Exception e) {
            log.error("SMS 발송 실패: to={}, error={}", toPhone, e.getMessage(), e);
            throw new IllegalStateException("문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
    }

    // SENS 서명 규칙: "POST(공백)uri\ntimestamp\naccessKey" 문자열을 secretKey로 HMAC-SHA256 서명한 뒤 Base64 인코딩한다.
    private String makeSignature(String uri, long timestamp) throws Exception {
        String message = HTTP_METHOD + " " + uri + "\n" + timestamp + "\n" + accessKey;

        SecretKeySpec signingKey = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(signingKey);
        byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(rawHmac);
    }
}
