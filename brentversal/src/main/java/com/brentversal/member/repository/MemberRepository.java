package com.brentversal.member.repository;

import com.brentversal.member.constant.SocialType;
import com.brentversal.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

// 인터페이스들끼리의 참조는 extends임 (implements가 아님)
// JpaRepository<관리하고자하는엔터티이름, 해당엔터티의기본키의타입> (Member의 기본키인 id의 타입은 Long)
public interface MemberRepository extends JpaRepository<Member, Long> {
    // 이메일을 사용하여 회원 정보를 조회하는 추상 메소드
    Member findByEmail (String email);

    // 전화번호 중복 체크용. Member.phone에도 unique 제약이 있어서 이걸 미리 확인하지 않으면
    // DB INSERT 시점에 DataIntegrityViolationException으로 그대로 터진다.
    Member findByPhone (String phone);

    // 소셜 로그인 성공 시, 이 소셜 계정이 이미 연결된 회원인지 찾는 메소드
    Member findBySocialTypeAndSocialUserId(SocialType socialType, String socialUserId);

    // 이메일 찾기 1단계 본인 확인용. phone이 unique이므로 이름까지 일치해야 결과가 나온다.
    Member findByNameAndPhone(String name, String phone);
}
