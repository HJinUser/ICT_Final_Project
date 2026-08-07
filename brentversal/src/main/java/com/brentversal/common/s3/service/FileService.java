package com.brentversal.common.s3.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.File;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class FileService {

    // ===== 로컬 저장용 =====
    @Value("${file.upload-dir}")
    private String uploadDir;        // 실제 저장 폴더
    @Value("${file.access-prefix}")
    private String accessPrefix;     // 브라우저 접근 경로 (/files)

    // ===== S3용 (키가 비어있으면 로컬 모드) =====
    @Value("${cloud.aws.s3.bucket:}")
    private String bucket;
    @Value("${cloud.aws.region:}")
    private String region;
    @Value("${cloud.aws.credentials.access-key:}")
    private String accessKey;
    @Value("${cloud.aws.credentials.secret-key:}")
    private String secretKey;

    // 환경변수로 만들어진 S3 클라이언트
    private S3Client s3Client;

    // 액세스 키가 있을 때만 S3 클라이언트를 미리 만들어둠
    // S3 클라이언트 : 스프링에서 AWS S3에 명령을 보내기 위한 S3 객체
    @PostConstruct
    public void init() {
        if (isS3Mode()) {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
            this.s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .build();
            System.out.println("[FileService] S3 모드로 동작합니다. bucket=" + bucket);
        } else {
            System.out.println("[FileService] 로컬 모드로 동작합니다. dir=" + uploadDir);
        }
    }

    // 키가 채워져 있으면 S3 모드, 비어있으면 로컬 모드
    // 위에 init() 함수에서 사용
    private boolean isS3Mode() {
        return accessKey != null && !accessKey.isBlank();
    }

    // 파일 저장 → 접근 가능한 URL(또는 경로) 반환
    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일이 없습니다.");
        }

        // 원본 확장자 추출 (ex : report.pdf → .pdf)
        String original = file.getOriginalFilename();
        String ext = "";
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf("."));
        }

        // 겹치지 않는 파일명 (시간 + 랜덤 + 확장자)
        String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String savedName = "file_" + time + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;

        if (isS3Mode()) {
            // ----- S3 업로드 -----
            // 원본 파일명을 다운로드 시 보여줄 이름으로 사용 (한글 안전하게 인코딩)
            String downloadName = (original != null && !original.isBlank()) ? original : savedName;
            String encodedName = URLEncoder.encode(downloadName, StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            try {
                PutObjectRequest request = PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(savedName)
                        .contentType(file.getContentType())
                        // 브라우저가 열지 말고 무조건 다운로드하게 강제 (한글 파일명 유지)
                        .contentDisposition("attachment; filename*=UTF-8''" + encodedName)
                        .build();
                s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
            } catch (IOException e) {
                throw new RuntimeException("S3 업로드 실패: " + e.getMessage(), e);
            }
            return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + savedName;

        } else {
            // ----- 로컬 저장 -----
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            try {
                file.transferTo(new File(dir, savedName));
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 실패: " + e.getMessage(), e);
            }
            // 브라우저 접근 경로 반환 (/files/file_xxx.pdf)
            return accessPrefix + "/" + savedName;
        }
    }

    // 파일 삭제 (URL이든 파일명이든 받아서 처리)
    public void delete(String fileUrlOrName) {
        if (fileUrlOrName == null || fileUrlOrName.isBlank()) {
            return;
        }
        // 마지막 / 뒤가 파일명(=S3 키)
        String fileName = fileUrlOrName.substring(fileUrlOrName.lastIndexOf("/") + 1);

        if (isS3Mode()) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(fileName)
                        .build());
            } catch (Exception e) {
                System.out.println("S3 파일 삭제 실패: " + e.getMessage());
            }
        } else {
            File target = new File(uploadDir, fileName);
            if (target.exists()) {
                target.delete();
            }
        }
    }
}