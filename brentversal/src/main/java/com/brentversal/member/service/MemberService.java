package com.brentversal.member.service;

import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.member.constant.Role;
import com.brentversal.member.dto.SignupDto;
import com.brentversal.member.entity.Broker;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.BrokerRepository;
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
    private final BrokerRepository brokerRepository; // 중개인 가입 시 자격 정보 저장용
    private final AgencyRepository agencyRepository; // 중개인 가입 시 소속 사무소 생성용

    public Member findByEmail(String email){
        return memberRepository.findByEmail(email);
    }

    @Autowired // 필드 주입 : 맴버 변수에 직접 의존성을 주입하는 방식
    private PasswordEncoder passwordEncoder ;


    // insert() 안에서 Member 저장 + (중개인이면) Broker/Agency 저장까지 하나의 트랜잭션으로 묶는다.
    // @Transactional이 없으면 각 save()가 각자 따로 커밋되어서, 중간에 실패했을 때
    // Broker/Agency 없이 Member만 저장된 반쪽짜리 회원이 생길 수 있다.
    // dto -> Member 변환은 여기서 직접 한다(04-16 OrderDto -> Order Entity 조립과 같은 방식).
    @Transactional
    public void insert(SignupDto dto){
        Member member = new Member();
        member.setName(dto.getName());
        member.setPhone(dto.getPhone());
        member.setEmail(dto.getEmail());
        member.setAddress(dto.getAddress());
        member.setRegdate(LocalDate.now());

        // 클라이언트가 role을 직접 정하게 하면 "ADMIN"을 보내는 식의 권한 상승이 가능해진다.
        // 그래서 role 자체는 안 받고, signupType이라는 제한된 값만 보고 서버가 role을 정한다.
        boolean isBroker = "BROKER".equals(dto.getSignupType());

        if (isBroker) {
            // 중개인은 비밀번호 없이 가입하고 이후 패스워드리스로만 로그인한다(Member.password 주석 참고).
            // DB에 아무것도 저장하기 전에 먼저 필수값을 검증한다.
            validateBrokerFields(dto);
            member.setRole(Role.BROKER);
            member.setPassword(null);
        } else {
            String password = dto.getPassword();
            if (password == null) {
                throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
            }

            boolean hasUpper = false; //대문자인지
            boolean hasLower = false; //소문자인지
            boolean hasDigit = false; //숫자인지
            boolean hasSpecial = false; //특수기호인지

            for(char c : password.toCharArray()) {
                if(Character.isUpperCase(c)){
                    hasUpper=true;
                }
                else if(Character.isLowerCase(c)){
                    hasLower=true;
                }
                else if(Character.isDigit(c)){
                    hasDigit = true;
                }
                else if(!Character.isLetterOrDigit(c)){
                    hasSpecial=true;
                }
            }

            if(!(hasUpper==true && hasLower==true && hasSpecial==true && hasDigit==true)){
                throw new IllegalArgumentException("비밀번호는 대문자, 소문자, 숫자, 특수문자가 포함되어야합니다.");
            }

            member.setRole(Role.USER);
            member.setPassword(passwordEncoder.encode(password));
        }

        memberRepository.save(member);

        if (isBroker) {
            saveBrokerProfile(member, dto);
        }
    }

    // 중개인 가입에서만 쓰는 필수값을 확인한다. 이름/전화번호/이메일은 SignupDto 쪽 @Valid가 이미 검증한다.
    private void validateBrokerFields(SignupDto dto){
        if (dto.getLicenseNumber() == null || dto.getLicenseNumber().isBlank()) {
            throw new IllegalArgumentException("공인중개사 등록번호를 입력해 주세요.");
        }
        if (dto.getAgencyName() == null || dto.getAgencyName().isBlank()) {
            throw new IllegalArgumentException("중개사무소명을 입력해 주세요.");
        }
        if (dto.getAgencyAddress() == null || dto.getAgencyAddress().isBlank()) {
            throw new IllegalArgumentException("중개사무소 주소를 입력해 주세요.");
        }
        if (dto.getOfficePhone() == null || dto.getOfficePhone().isBlank()) {
            throw new IllegalArgumentException("사무실 번호를 입력해 주세요.");
        }
    }

    // Member 저장 뒤(= member.getId()가 생긴 뒤) 호출해서 Broker와 Agency를 함께 만든다.
    private void saveBrokerProfile(Member member, SignupDto dto){
        Broker broker = new Broker();
        broker.setMember(member); // Broker가 FK(member_id)를 가진 주인이라, Member의 PK를 그대로 참조로 넣는다
        broker.setLicenseNumber(dto.getLicenseNumber());
        brokerRepository.save(broker);

        Agency agency = new Agency();
        agency.setMember(member);
        agency.setName(dto.getAgencyName());
        agency.setBrokerName(member.getName());
        agency.setAddress(dto.getAgencyAddress());
        agency.setPhone(dto.getOfficePhone());
        agency.setRegdate(LocalDate.now());
        agencyRepository.save(agency);
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

    // 로그아웃: 저장해 둔 refresh token 을 지워서, 이후 그 토큰으로 들어오는 재발급 요청을 전부 거부되게 만든다.
    // updateRefreshToken() 과 구조는 같고, 새 토큰을 넣는 대신 null 로 비운다는 점만 다르다.
    @Transactional
    public void clearRefreshToken(String email){ // 매개변수: 로그아웃하는 회원의 이메일
        Member member = memberRepository.findByEmail(email); // 이메일로 회원을 조회한다
        if(member == null){ // 혹시 회원이 없으면(비정상 상황)
            return; // 아무 것도 하지 않고 그냥 종료한다
        }
        member.setRefreshToken(null); // refresh token 을 비운다
    }
}
