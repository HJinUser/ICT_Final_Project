package com.brentversal.member.repository;

import com.brentversal.member.constant.VerifyStatus;
import com.brentversal.member.entity.Broker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BrokerRepository extends JpaRepository<Broker, Long> {

    // 로그인한 중개인의 자격 정보를 찾을 때 쓴다.
    // Broker 가 Member 를 @OneToOne 으로 갖고 있으므로 member.id 를 타고 들어가 조회한다.
    // (member_id 는 unique 라 결과가 최대 1건이다)
    Optional<Broker> findByMemberId(Long memberId);

    // 관리자 화면에서 심사 대기 중인 신청만 모아 볼 때 쓴다.
    List<Broker> findByVerifyStatusOrderBySubmittedAtAsc(VerifyStatus verifyStatus);
}
