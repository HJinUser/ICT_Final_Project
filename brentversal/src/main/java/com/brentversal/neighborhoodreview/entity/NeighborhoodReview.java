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
@Table(
        name = "neighborhood_review",
        uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "admin_code"})
)
// 회원이 특정 행정동에 작성한 한줄평과 수정시각을 DB에 저장하는 Entity임
public class NeighborhoodReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
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