package com.brentversal.editrequest.entity;

import com.brentversal.editrequest.constant.EditRequestStatus;
import com.brentversal.member.entity.Member;
import com.brentversal.property.entity.Property;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/*
  관리자가 중개인에게 보내는 "매물 수정 요청" 한 건.

  반려(등록 취소)는 되돌릴 수 없어서, 사진이 부족하다거나 설명이 부실한 정도의 문제까지
  반려로 처리하면 중개인이 매물을 통째로 다시 올려야 한다. 그래서 매물은 그대로 두고
  무엇을 고쳐야 하는지만 알리는 통로를 따로 둔다.

  ERD 의 tickets(type = MODIFY_REQUEST) 에 해당한다. 문의·신고는 이미 각자 테이블을
  쓰고 있어서 여기서도 같은 방식으로 자기 테이블을 갖는다.
*/
@Getter @Setter @ToString @Entity
@Table(name = "property_edit_requests")
public class PropertyEditRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "edit_request_id")
    private Long id;

    // 수정을 요청받은 매물
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    @ToString.Exclude
    private Property property;

    // 요청을 보낸 관리자. 관리자 계정이 여러 개일 수 있어 누가 보냈는지 남긴다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    @ToString.Exclude
    private Member requester;

    // 무엇을 어떻게 고쳐야 하는지. 중개인 화면과 안내 메일에 그대로 나간다.
    @Column(nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EditRequestStatus status = EditRequestStatus.REQUESTED;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // 중개인이 매물을 수정해서 처리 완료가 된 시각. 아직 처리 전이면 비어 있다.
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
