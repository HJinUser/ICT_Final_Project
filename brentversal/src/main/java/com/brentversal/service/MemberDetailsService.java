package com.brentversal.service;

import com.brentversal.entity.Member;
import com.brentversal.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service // 클래스는 서비스 목적으로 사용된다.
@RequiredArgsConstructor
public class MemberDetailsService implements UserDetailsService {
    private final MemberRepository memberRepository ;

    @Override // 스프링 시큐리티가 인증 처리를 시작하면서 이 메소드를 자동으로 호출합니다.
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Member member = memberRepository.findByEmail(email) ;

        if(member == null){
            String message = "이메일이 " + email + "인 회원은 존재하지 않습니다.";

            // 존재하지 않는 회원이니까 예외를 발생시켜야함(일으켜야함)
            // 자바에서 사용자가 예외를 발생시키고자 하는 경우에는 throw 키워드를 사용합니다.
            throw new UsernameNotFoundException(message); // 객체임

        }else{
            // 나중에 디버깅할때 어디서 나왔는지 알려고 메소드명을 적음
            System.out.println("loadUserByUsername() 메소드");
            System.out.println(member);
        }
        // User는 UserDetails(인터페이스-구현체필요)와 상속관계여서 구현체?느낌으로 사용?
        return User.builder()
                .username(member.getEmail())
                .password(member.getPassword())
                .roles(member.getRole().name())
                .build();
    }
}
