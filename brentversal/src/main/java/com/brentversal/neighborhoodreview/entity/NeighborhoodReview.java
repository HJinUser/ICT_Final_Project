package com.brentversal.neighborhoodreview.entity;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.member.entity.Member;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
/*
  한 회원이 같은 동네에 여러 번 남길 수 있다.

  예전에는 (member_id, admin_code) 유니크 제약으로 한 명당 한 개만 두고 다시 쓰면 덮어썼는데,
  살면서 느낀 점이 시기마다 달라질 수 있어 여러 개를 남길 수 있게 바꿨다.

  주의: 이 제약을 지워도 Hibernate 의 ddl-auto=update 는 이미 만들어진 DB 제약을 지우지 않는다.
  운영 DB에서는 ALTER TABLE 로 직접 걷어내야 한다.
*/
@Table(name = "neighborhood_review")
// 회원이 특정 행정동에 작성한 한줄평과 수정시각을 DB에 저장하는 Entity임
public class NeighborhoodReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = true)
    private Member member;

    @Column(name = "admin_code", length = 20, nullable = false)
    private String adminCode;

    @Column(name = "admin_name", length = 50, nullable = false)
    private String adminName;

    @Column(name = "district_name", length = 20, nullable = false)
    private String districtName;

    @Column(name = "content", length = 300, nullable = false)
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}