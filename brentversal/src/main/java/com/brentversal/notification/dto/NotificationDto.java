package com.brentversal.notification.dto;

import com.brentversal.notification.constant.NotificationType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 헤더 종 아이콘을 눌렀을 때 펼쳐지는 알림 한 줄
//
// 역할(일반 사용자·중개인·관리자)마다 받는 알림의 '내용'은 다르지만 '모양'은 모두 같다.
//   제목 / 내용 미리보기 / 눌렀을 때 이동할 주소 / 시각
// 그래서 역할별로 DTO 를 나누지 않고 이 하나를 함께 쓴다.
// 종류 구분이 필요하면 type 을 보면 되고, 프론트는 한 가지 모양만 그리면 된다.
//
// 알림 전용 테이블은 만들지 않았다. 알림으로 보여 줄 항목(미답변 상담, 승인 대기 매물 등)이
// 모두 이미 DB 에 있는 값이라 그때그때 모아서 내려 주면 되고,
// 처리하고 나면 목록에서 자연스럽게 사라지므로 "읽음" 여부도 저장할 필요가 없다.
@Getter @Setter
public class NotificationDto {
    private NotificationType type ; // 알림 종류 (JSON 에는 "CONSULTATION" 처럼 이름으로 나간다)
    private String typeLabel ;      // 화면에 그대로 쓸 한글 이름
    private Long targetId ;         // 원본 자료의 id (상담·리뷰·매물·인증 신청 등)
    private String title ;          // "새 상담 요청이 도착했습니다."
    private String message ;        // 내용 미리보기
    private String linkPath ;       // 눌렀을 때 프론트가 이동할 주소

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime createdAt ;

    public static NotificationDto of(NotificationType type, Long targetId, String title, String message,
                                     String linkPath, LocalDateTime createdAt){
        NotificationDto dto = new NotificationDto();

        dto.setType(type);
        dto.setTypeLabel(type == null ? "" : type.getLabel());
        dto.setTargetId(targetId);
        dto.setTitle(title);
        dto.setMessage(message);
        dto.setLinkPath(linkPath);
        dto.setCreatedAt(createdAt);

        return dto;
    }
}
