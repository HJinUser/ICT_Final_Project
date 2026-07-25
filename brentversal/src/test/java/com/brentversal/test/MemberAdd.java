package com.brentversal.test;
import com.brentversal.constant.Role;
import com.brentversal.entity.Member;
import com.brentversal.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestConstructor;

import java.time.LocalDate;

// 백엔드 기능이 실제로 잘 작동하는지 **'테스트'**해보기 위한 전용 클래스
@SpringBootTest
@RequiredArgsConstructor // final 변수에 값을 전해줄 수 있는 방법.
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
public class MemberAdd {
    // MemberTest는 passwordEncoder를 의존하는데 passwordEncoder는 null값이라서
    // 외부에서 주입해야 함
    // final 변수는 원래 값이 변하지 않는데 외부에서 값을 전해줄 수 있는 방법이 존재함.
    private final MemberRepository memberRepository ;
    private final PasswordEncoder passwordEncoder ;


    @Test
    @DisplayName("회원 몇 명 추가하기") // 내가 실행하고 있는 것을 한글로 알려주려고
    void insertMember(){
        Member mem01 = new Member();
        mem01.setName("관리자");
        mem01.setEmail("admin@naver.com");
        mem01.setPassword(passwordEncoder.encode("Admin@123"));
        mem01.setAddress("마포구 공덕동");
        mem01.setRole(Role.ADMIN);
        mem01.setRegdate(LocalDate.now());

        memberRepository.save(mem01) ;
        System.out.println("----------------------------------------");

        Member mem02 = new Member();
        mem02.setName("유영석");
        mem02.setEmail("bluesky@naver.com");
        mem02.setPassword(passwordEncoder.encode("Bluesky@456"));
        mem02.setAddress("용산구 이태원동");
        mem02.setRole(Role.USER);
        mem02.setRegdate(LocalDate.now());
        memberRepository.save(mem02) ;
        System.out.println("----------------------");

        Member mem03 = new Member();
        mem03.setName("곰돌이");
        mem03.setEmail("gomdori@naver.com");
        mem03.setPassword(passwordEncoder.encode("Gomdori@789"));
        mem03.setAddress("동대문구 휘경동");
        mem03.setRole(Role.USER);
        mem03.setRegdate(LocalDate.now());
        memberRepository.save(mem03) ;
        System.out.println("----------------------");

    }

}
