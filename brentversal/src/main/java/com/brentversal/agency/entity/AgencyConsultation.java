package com.brentversal.agency.entity;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 사용자가 중개사무소에 보낸 상담 요청 1건을 의미하는 엔터티 클래스
@Getter @Setter @ToString @Entity
@Table(name = "agency_consultations")
public class AgencyConsultation {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "consultation_id")
    private Long id ;

    // 상담을 요청받은 중개사무소
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    @ToString.Exclude
    private Agency agency ;

    // 상담을 요청한 회원 (로그인한 사용자)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = true)
    @ToString.Exclude
    private Member member ;

    // 상담을 원하는 매물. 매물을 고르지 않고 일반 문의만 보낼 수도 있어서 비워 둘 수 있다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = true)
    @ToString.Exclude
    private Property property ;

    @Column(name = "preferred_date")
    private LocalDate preferredDate ; // 상담 희망일

    @Column(length = 1000)
    private String content ; // 문의 내용

    // 내 정보를 중개사에게 제공하는 데 동의했는지 여부.
    // 화면에서 동의해야만 요청을 보낼 수 있고, 서버에서도 한 번 더 확인한다.
    @Column(nullable = false)
    private boolean agreed = false ;

    // 진행 상태. 요청이 들어오면 '상담 요청(REQUESTED)'으로 시작한다.
    // 중개인이 답변을 보내면 '상담 확정', 상담이 끝나면 '상담 완료'로 바뀐다.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConsultationStatus status = ConsultationStatus.REQUESTED ;

    @Column(name = "created_at")
    private LocalDateTime createdAt ; // 요청이 들어온 시각 (알림 목록의 정렬 기준)

    // ── 중개인이 보내는 답변 ─────────────────────────────
    // "답변하기" 화면에서 중개인이 작성한 내용이 여기에 저장된다.
    // 답변이 저장되면 status 가 ANSWERED 로 바뀐다.
    @Column(length = 2000)
    private String reply ;

    @Column(name = "replied_at")
    private LocalDateTime repliedAt ; // 답변을 보낸 시각 (답변 전에는 null)

    // 요청한 사용자가 답변을 확인한 시각 (확인 전에는 null)
    //
    // 헤더 알림은 "답변이 왔는데 아직 안 본 상담"을 보여 준다.
    // 중개인 알림은 답변을 하면 목록에서 사라지지만, 사용자 알림은 그런 계기가 없어서
    // 이 값을 두지 않으면 한 번 온 답변 알림이 영원히 남는다.
    @Column(name = "reply_checked_at")
    private LocalDateTime replyCheckedAt ;
}
