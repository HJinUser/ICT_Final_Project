package com.brentversal.property.repository;

import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.entity.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByIdIn(List<Long> ids);

    // ↓ 중개사무소 상세 페이지(담당 매물 영역)에서 쓰는 조회 메소드들
    // 게시중(ACTIVE)이면서 공개(visible=true)인 매물만 다른 화면에 노출되므로 두 조건을 함께 건다.
    List<Property> findByAgencyIdAndStatusAndVisibleTrueOrderByCreatedAtDesc(Long agencyId, PropertyStatus status);

    // 담당 매물 전체 건수
    long countByAgencyIdAndStatusAndVisibleTrue(Long agencyId, PropertyStatus status);

    // 오늘 새로 올라온 매물 건수 (from 에 오늘 0시를 넘긴다)
    long countByAgencyIdAndStatusAndVisibleTrueAndCreatedAtAfter(Long agencyId, PropertyStatus status, LocalDateTime from);

    // ↓ 중개인 마이페이지("내 중개사무소")에서 쓰는 조회 메소드들
    // 내가 등록한 매물은 비공개·승인대기까지 모두 보여야 하므로 상태 조건 없이 가져온다.
    // 한 페이지에 6개씩(2행 3열) 끊어 보여 주기 때문에 Pageable 을 받는다.
    Page<Property> findByAgencyIdOrderByCreatedAtDesc(Long agencyId, Pageable pageable);

    // 대시보드의 "게시 중 / 거래 진행 중 / 거래 완료" 건수 (공개 여부와 상관없이 센다)
    long countByAgencyIdAndStatus(Long agencyId, PropertyStatus status);

}
