package com.brentversal.member.service;

import com.brentversal.member.constant.Role;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemberService { // MemberService가 MemberRepository를 의존하고 있음
    private final MemberRepository memberRepository; // 의존 + 무의미한 데이터여서 주입(injection)해야 함 + final로 변경

    public Member findByEmail(String email){
        return memberRepository.findByEmail(email);
    }

    @Autowired // 필드 주입 : 맴버 변수에 직접 의존성을 주입하는 방식
    private PasswordEncoder passwordEncoder ;


    public void insert(Member bean){
        // 회원 가입한 사용자의 역할과 등록 일자는 여기서 설정
        bean.setRole(Role.USER);
        bean.setRegdate(LocalDate.now());

        String encodedPassword = passwordEncoder.encode(bean.getPassword());
        bean.setPassword(encodedPassword);

        memberRepository.save(bean);
    }

    public Optional<Member> findMemberById(Long memberId){
        return this.memberRepository.findById(memberId);
    }

    // [refresh] 로그인에 성공했을 때 발급한 refresh token 을 해당 회원 레코드에 저장하는 메소드.
    // [refresh] @Transactional 을 붙여야 아래에서 값만 바꿔도 트랜잭션 종료 시 UPDATE 쿼리가 자동 실행된다(변경 감지, dirty checking).
    @Transactional // [refresh] 이 메소드를 하나의 트랜잭션으로 묶는다
    public void updateRefreshToken(String email, String refreshToken){ // [refresh] 매개변수: 회원 이메일, 새로 발급한 refresh token
        Member member = memberRepository.findByEmail(email); // [refresh] 이메일로 회원을 조회한다
        if(member == null){ // [refresh] 혹시 회원이 없으면(비정상 상황)
            return; // [refresh] 아무 것도 하지 않고 그냥 종료한다(NullPointerException 방지)
        }
        member.setRefreshToken(refreshToken); // [refresh] 조회한 회원 객체의 refreshToken 필드를 새 값으로 바꾼다
        // [refresh] 여기서 save() 를 호출하지 않아도, 영속 상태(managed) 엔터티라서 트랜잭션이 끝날 때 변경 내용이 DB 에 반영된다
    }
}
