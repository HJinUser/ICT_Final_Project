package com.brentversal.agency.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 헤더 종 모양 아이콘을 눌렀을 때 펼쳐지는 알림 한 줄
//
// 알림 전용 테이블을 따로 만들지 않았다. 중개인이 받아야 할 알림은
//   (1) 아직 답변하지 않은 상담 요청, (2) 아직 답변하지 않은 리뷰
// 두 가지뿐이고, 두 정보 모두 이미 DB 에 있기 때문이다.
// "읽음" 여부도 따로 저장하지 않는다. 답변을 하면 목록에서 자연스럽게 사라지므로
// 답변 여부가 곧 읽음 표시 역할을 한다.
//
// 나중에 알림 종류가 늘어나면 그때 notification 테이블을 만들어 이 DTO 형태로 내려 주면
// 프론트는 고치지 않아도 된다.
@Getter @Setter
public class NotificationDto {
    private String type ;      // CONSULTATION(상담 요청) / REVIEW(리뷰)
    private Long targetId ;    // 상담 또는 리뷰의 id (클릭했을 때 이동할 대상)
    private String title ;     // "새 상담 요청이 도착했습니다."
    private String message ;   // 내용 미리보기
    private String linkPath ;  // 프론트에서 이동할 주소

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm")
    private LocalDateTime createdAt ;

    public static NotificationDto of(String type, Long targetId, String title, String message,
                                     String linkPath, LocalDateTime createdAt){
        NotificationDto dto = new NotificationDto();

        dto.setType(type);
        dto.setTargetId(targetId);
        dto.setTitle(title);
        dto.setMessage(message);
        dto.setLinkPath(linkPath);
        dto.setCreatedAt(createdAt);

        return dto;
    }
}
