package com.brentversal.member.controller;

import com.brentversal.member.dto.BrokerVerificationDto;
import com.brentversal.member.service.BrokerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

// 중개인 본인이 쓰는 인증 신청 API
// 로그인이 필요한 경로다 (SecurityConfig 의 anyRequest().authenticated() 에 걸린다).
@RestController
@RequestMapping("/broker")
@RequiredArgsConstructor
public class BrokerController {
    private final BrokerService brokerService ;

    // 내 인증 상태 조회
    // GET /broker/verification
    // 아직 신청한 적이 없으면 상태만 UNVERIFIED 로 채워서 돌려준다(프론트에서 분기하기 쉽게).
    @GetMapping("/verification")
    public ResponseEntity<BrokerVerificationDto> myVerification(Principal principal){
        Optional<BrokerVerificationDto> found = brokerService.findMyVerification(principal.getName());

        if(found.isPresent()){
            return ResponseEntity.ok(found.get());
        }

        BrokerVerificationDto empty = new BrokerVerificationDto();
        empty.setVerifyStatus("UNVERIFIED");
        empty.setVerifyStatusLabel("미인증");

        return ResponseEntity.ok(empty);
    }

    // 인증 신청(또는 반려 후 재신청)
    // POST /broker/verification
    //
    // 자격증 사진(파일)과 입력값(JSON)을 함께 보내야 해서 multipart/form-data 로 받는다.
    // 프론트는 FormData 에 info(JSON 문자열이 아닌 객체 파트)와 licenseImage(파일)를 담아 보낸다.
    @PostMapping(value = "/verification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submit(
            @RequestPart("info") BrokerVerificationDto dto,
            @RequestPart(value = "licenseImage", required = false) MultipartFile licenseImage,
            Principal principal){

        try {
            BrokerVerificationDto saved = brokerService.submit(principal.getName(), dto, licenseImage);

            return ResponseEntity.ok(Map.of(
                    "message", "인증 신청을 접수했습니다. 관리자 확인 후 인증 마크가 발급됩니다.",
                    "verification", saved));

        } catch (IllegalArgumentException e) {
            // 입력값이 잘못된 경우 : 원인을 알 수 있게 메시지와 함께 400 으로 응답한다
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
