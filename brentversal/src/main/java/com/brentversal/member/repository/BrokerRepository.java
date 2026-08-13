package com.brentversal.member.repository;

import com.brentversal.member.constant.VerifyStatus;
import com.brentversal.member.entity.Broker;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // ↓ 관리자 "중개인 인증" 화면에서 쓰는 조회 메소드들
    // 심사 대기는 먼저 신청한 사람부터 처리해야 하므로 신청 시각 오름차순으로 가져온다.
    Page<Broker> findByVerifyStatusOrderBySubmittedAtAsc(VerifyStatus verifyStatus, Pageable pageable);

    // 상태 구분 없이 전체를 볼 때는 최근 신청부터 보여 준다.
    // 아직 신청한 적이 없는 중개인(submittedAt 이 null)은 뒤로 밀린다.
    Page<Broker> findAllByOrderBySubmittedAtDesc(Pageable pageable);

    // 상단 요약의 "심사 대기" 건수
    long countByVerifyStatus(VerifyStatus verifyStatus);
}
