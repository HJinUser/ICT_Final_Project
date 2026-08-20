package com.brentversal.propertyreview.service;

import com.brentversal.member.entity.Member;
import com.brentversal.member.service.MemberService;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.propertyreview.dto.PropertyReviewDto;
import com.brentversal.propertyreview.dto.PropertyReviewRequestDto;
import com.brentversal.propertyreview.entity.PropertyReview;
import com.brentversal.propertyreview.repository.PropertyReviewRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/*
  매물 한줄평 조회와 작성을 처리한다.

  한 사람은 같은 매물에 한 개만 남긴다. 다시 쓰면 새로 만들지 않고 기존 글을 고친다.
  같은 사람이 별점만 바꿔 여러 번 올려 평균을 흔드는 것을 막기 위해서다.

  누가 쓸 수 있는지는 SecurityConfig 에서 ROLE_USER 로 막아 둔다.
  중개인은 자기 매물을 스스로 평가할 수 있으면 안 되고, 관리자는 평가 주체가 아니다.
*/
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PropertyReviewService {

    private final PropertyReviewRepository reviewRepository;
    private final PropertyRepository propertyRepository;
    private final MemberService memberService;

    // 매물의 한줄평 목록. 비회원도 보는 화면이라 email 이 null 로 들어올 수 있다.
    public List<PropertyReviewDto> findByProperty(Long propertyId, String email) {
        // 없는 매물의 한줄평을 조회하는 것은 잘못된 요청이므로 빈 목록 대신 오류로 알린다
        if (!propertyRepository.existsById(propertyId)) {
            throw new EntityNotFoundException("해당 매물을 찾을 수 없습니다.");
        }

        Long viewerId = findMemberId(email);

        return reviewRepository.findByPropertyId(propertyId)
                .stream()
                .map(review -> PropertyReviewDto.of(review, viewerId))
                .toList();
    }

    // 한줄평을 남긴다. 같은 매물에 이미 쓴 글이 있으면 그 글을 고친다.
    @Transactional
    public PropertyReviewDto save(Long propertyId, String email, PropertyReviewRequestDto dto) {
        // 로그인 정보가 없으면 작성자를 특정할 수 없다
        if (email == null || email.isBlank()) {
            throw new EntityNotFoundException("로그인 정보를 확인할 수 없습니다.");
        }

        Member member = memberService.findByEmail(email);
        if (member == null) {
            throw new EntityNotFoundException("사용자를 찾을 수 없습니다.");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new EntityNotFoundException("해당 매물을 찾을 수 없습니다."));

        LocalDateTime now = LocalDateTime.now();

        PropertyReview review = reviewRepository
                .findByPropertyIdAndMemberId(propertyId, member.getId())
                .orElseGet(() -> {
                    PropertyReview created = new PropertyReview();
                    created.setProperty(property);
                    created.setMember(member);
                    created.setCreatedAt(now);
                    return created;
                });

        review.setRating(dto.getRating());
        review.setContent(dto.getContent().trim());
        review.setUpdatedAt(now);

        PropertyReview saved = reviewRepository.save(review);
        log.debug("매물 한줄평 저장. propertyId={} memberId={}", propertyId, member.getId());

        return PropertyReviewDto.of(saved, member.getId());
    }

    // 로그인한 사람의 회원 번호. 비회원이면 null 이다.
    // 목록에서 "내가 쓴 글"을 표시하기 위한 값이라, 찾지 못해도 오류로 만들지 않는다.
    private Long findMemberId(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        Member member = memberService.findByEmail(email);
        return (member == null) ? null : member.getId();
    }
}
