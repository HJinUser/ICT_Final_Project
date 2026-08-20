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

    // 회원과 행정동 기준 기존 한줄평이 있으면 수정하고 없으면 새로 만들어 저장하는 Service 메서드임
    @Transactional
    public NeighborhoodReviewResponseDto save(String email, NeighborhoodReviewRequestDto dto) {
        Member member = memberService.findByEmail(email);
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (member == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new EntityNotFoundException("사용자를 찾을 수 없습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        NeighborhoodReview review = repository
                .findByMemberIdAndAdminCode(member.getId(), dto.getAdminCode())
                .orElseGet(() -> {
                    NeighborhoodReview created = new NeighborhoodReview();
                    created.setMember(member);
                    created.setAdminCode(dto.getAdminCode());
                    created.setCreatedAt(now);
                    // 처리 완료된 결과를 호출한 쪽으로 반환함
                    return created;
                });

        review.setAdminName(dto.getAdminName());
        review.setDistrictName(dto.getDistrictName());
        review.setContent(dto.getContent().trim());
        review.setUpdatedAt(now);

        // 저장한 NeighborhoodReview Entity를 응답 DTO로 변환해 반환함
        return NeighborhoodReviewResponseDto.of(repository.save(review));
    }

    // adminCode 기준 최신 동네 한줄평 최대 50건을 조회해 응답 DTO 목록으로 반환하는 Service 메서드임
    @Transactional(readOnly = true)
    public List<NeighborhoodReviewResponseDto> findByAdminCode(String adminCode) {
        // 해당 행정동의 최신 한줄평 최대 50개를 조회해 응답 DTO 목록으로 반환함
        return repository.findTop50ByAdminCodeOrderByUpdatedAtDesc(adminCode)
                .stream()
                .map(NeighborhoodReviewResponseDto::of)
                .toList();
    }
}