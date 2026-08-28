package com.brentversal.neighborhoodreview.service;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.member.entity.Member;
import com.brentversal.member.service.MemberService;
import com.brentversal.neighborhoodreview.dto.NeighborhoodReviewRequestDto;
import com.brentversal.neighborhoodreview.dto.NeighborhoodReviewResponseDto;
import com.brentversal.neighborhoodreview.entity.NeighborhoodReview;
import com.brentversal.neighborhoodreview.repository.NeighborhoodReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// 행정동 한줄평 목록 조회와 회원별 한줄평 생성·수정을 처리하는 Service임
@Service
@RequiredArgsConstructor
public class NeighborhoodReviewService {

    private final NeighborhoodReviewRepository repository;
    private final MemberService memberService;

    /*
      한줄평을 새로 남기는 Service 메서드임.

      예전에는 같은 동네에 이미 쓴 글이 있으면 그것을 고쳤는데, 지금은 항상 새 글로 쌓는다.
      한 사람이 시기를 달리해 여러 번 남길 수 있어야 하기 때문이다.

      돌려주는 DTO 는 작성자 이름을 익명으로 담는다. 목록에 보이는 모습과 같게 맞춘 것이고,
      화면도 이 응답의 이름을 쓰지 않고 목록을 다시 읽는다.
    */
    @Transactional
    public NeighborhoodReviewResponseDto save(String email, NeighborhoodReviewRequestDto dto) {
        Member member = memberService.findByEmail(email);
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (member == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new EntityNotFoundException("사용자를 찾을 수 없습니다.");
        }

        LocalDateTime now = LocalDateTime.now();

        NeighborhoodReview review = new NeighborhoodReview();
        review.setMember(member);
        review.setAdminCode(dto.getAdminCode());
        review.setAdminName(dto.getAdminName());
        review.setDistrictName(dto.getDistrictName());
        review.setContent(dto.getContent().trim());
        review.setCreatedAt(now);
        review.setUpdatedAt(now);

        // 저장한 NeighborhoodReview Entity를 응답 DTO로 변환해 반환함
        return NeighborhoodReviewResponseDto.of(repository.save(review), false);
    }

    /*
      adminCode 기준 최신 동네 한줄평 최대 50건을 조회해 응답 DTO 목록으로 반환하는 Service 메서드임.

      revealAuthor 는 관리자 요청일 때만 true 다. 관리자만 실제 작성자를 볼 수 있고
      일반 사용자·중개인·비로그인에게는 "익명"으로 나간다.
    */
    @Transactional(readOnly = true)
    public List<NeighborhoodReviewResponseDto> findByAdminCode(String adminCode, boolean revealAuthor) {
        // 해당 행정동의 최신 한줄평 최대 50개를 조회해 응답 DTO 목록으로 반환함
        return repository.findTop50ByAdminCodeOrderByUpdatedAtDesc(adminCode)
                .stream()
                .map(review -> NeighborhoodReviewResponseDto.of(review, revealAuthor))
                .toList();
    }
}