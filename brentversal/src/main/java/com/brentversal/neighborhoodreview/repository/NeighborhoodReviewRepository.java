package com.brentversal.neighborhoodreview.repository;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.neighborhoodreview.entity.NeighborhoodReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// 행정동별 한줄평 목록과 회원별 한줄평을 조회하는 Repository임
public interface NeighborhoodReviewRepository extends JpaRepository<NeighborhoodReview, Long> {
    // 한 사람이 같은 동네에 여러 개를 남길 수 있게 되면서
    // (회원, 행정동) 으로 한 건을 찾던 findByMemberIdAndAdminCode 는 더 이상 쓰지 않는다.
    List<NeighborhoodReview> findTop50ByAdminCodeOrderByUpdatedAtDesc(String adminCode);

    // 회원 탈퇴 처리에서 그 회원이 남긴 한줄평을 정리할 때 쓴다(MemberService 참고).
    List<NeighborhoodReview> findByMemberId(Long memberId);
}