package com.brentversal.member.repository;

import com.brentversal.member.entity.BrokerLicenseImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BrokerLicenseImageRepository extends JpaRepository<BrokerLicenseImage, Long> {

    // 이 중개인이 지금까지 제출한 자격증 사진을 최신순으로 모아 볼 때 쓴다. (마이페이지 이력 화면 등에서 활용 가능)
    List<BrokerLicenseImage> findByBrokerIdOrderBySubmittedAtDesc(Long brokerId);

    // 현재 유효한(최신) 사진 한 장만 찾을 때 쓴다. 정상 흐름에서는 항상 최대 1건이다.
    Optional<BrokerLicenseImage> findByBrokerIdAndIsCurrentTrue(Long brokerId);
}