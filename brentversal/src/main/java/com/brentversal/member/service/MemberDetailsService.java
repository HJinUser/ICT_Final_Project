package com.brentversal.member.service;

import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

// AuthenticationManager가 로그인 시도를 검증할 때(email/password) 호출하는 클래스.
// email(username)로 실제 Member를 찾아, 스프링 시큐리티가 이해하는 UserDetails로 바꿔준다.
// 이 클래스가 없으면 AuthenticationManager는 검증할 대상이 없어서 모든 로그인이 실패한다.
@Service
@RequiredArgsConstructor
public class MemberDetailsService implements UserDetailsService {

    private final MemberRepository memberRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Member member = memberRepository.findByEmail(email);

        if (member == null) {
            // 실제로는 없는 이메일이라고 그대로 알려주지 않는다.
            // MemberController.login()의 catch(AuthenticationException)가 이 예외를 잡아
            // "이메일 또는 비밀 번호가 올바르지 않습니다"라는 동일한 메시지로 돌려준다.
            throw new UsernameNotFoundException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        if (member.getPassword() == null) {
            // 중개인(패스워드리스 전용)이나 소셜 전용 계정은 비밀번호가 없어서
            // 이 방식(email+password)으로는 애초에 로그인할 수 없다.
            throw new UsernameNotFoundException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        return User.builder()
                .username(member.getEmail())
                .password(member.getPassword()) // BCrypt로 이미 인코딩되어 저장된 값
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + member.getRole().name())))
                .build();
    }
}
