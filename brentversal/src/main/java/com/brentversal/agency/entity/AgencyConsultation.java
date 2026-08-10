package com.brentversal.agency.entity;

import com.brentversal.agency.constant.ConsultationStatus;
import com.brentversal.member.entity.Member;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 사용자가 중개사무소에 보낸 상담 요청 1건을 의미하는 엔터티 클래스
@Getter @Setter @ToString @Entity
@Table(name = "agency_consultation")
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
    @JoinColumn(name = "member_id", nullable = false)
    @ToString.Exclude
    private Member member ;

    // 상담을 원하는 매물. 매물을 고르지 않고 일반 문의만 보낼 수도 있어서 비워 둘 수 있다.
    // property 테이블은 다른 팀원이 만드는 중이라 아직 연관관계 대신 id 만 저장한다.
    // (property/entity/Property.java 도 같은 방식으로 agency_id 를 Long 으로 갖고 있다)
    @Column(name = "property_id")
    private Long propertyId ;

    @Column(name = "preferred_date")
    private LocalDate preferredDate ; // 상담 희망일

    @Column(length = 1000)
    private String content ; // 문의 내용

    // 내 정보를 중개사에게 제공하는 데 동의했는지 여부.
    // 화면에서 동의해야만 요청을 보낼 수 있고, 서버에서도 한 번 더 확인한다.
    @Column(nullable = false)
    private boolean agreed = false ;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConsultationStatus status = ConsultationStatus.REQUESTED ;

    @Column(name = "created_at")
    private LocalDateTime createdAt ;
}
