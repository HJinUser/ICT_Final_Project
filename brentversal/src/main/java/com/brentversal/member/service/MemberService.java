package com.brentversal.member.service;

import com.brentversal.agency.entity.Agency;
import com.brentversal.agency.repository.AgencyConsultationRepository;
import com.brentversal.agency.repository.AgencyRepository;
import com.brentversal.agency.repository.AgencyReviewRepository;
import com.brentversal.agency.service.AgencyService;
import com.brentversal.common.config.JwtTokenProvider;
import com.brentversal.favorite.repository.FavoriteRepository;
import com.brentversal.member.constant.Role;
import com.brentversal.member.constant.SocialType;
import com.brentversal.member.dto.SignupDto;
import com.brentversal.member.entity.Broker;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.BrokerRepository;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.member.validation.PasswordPolicy;
import com.brentversal.neighborhoodreview.repository.NeighborhoodReviewRepository;
import com.brentversal.passwordless.client.PasswordlessClient;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.propertyreview.repository.PropertyReviewRepository;
import com.brentversal.recommendation.repository.RecentSearchRepository;
import com.brentversal.recommendation.repository.RecommendationBestRepository;
import com.brentversal.recommendation.repository.RecommendationFeedbackRepository;
import com.brentversal.recommendation.repository.UserPreferenceRepository;
import com.brentversal.report.entity.ReportEntity;
import com.brentversal.report.repository.ReportRepository;
import io.jsonwebtoken.Claims;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemberService { // MemberService가 MemberRepository를 의존하고 있음
    private final MemberRepository memberRepository; // 의존 + 무의미한 데이터여서 주입(injection)해야 함 + final로 변경
    private final BrokerRepository brokerRepository; // 중개인 가입 시 자격 정보 저장용
    // 중개인 가입 시 소속 사무소 생성용.
    // 사무소를 직접 만들지 않고 이 서비스에 맡기는 이유는, 주소로 좌표(위도·경도)를 채우는 일까지
    // 함께 처리해 주기 때문이다. 좌표가 없으면 중개사무소 안내 지도에 마커가 찍히지 않는다.
    private final AgencyService agencyService;
    private final JwtTokenProvider jwtTokenProvider; // 소셜 가입 토큰(socialToken) 검증용

    private final AgencyReviewRepository agencyReviewRepository;
    private final AgencyConsultationRepository agencyConsultationRepository;
    private final PropertyReviewRepository propertyReviewRepository;
    private final NeighborhoodReviewRepository neighborhoodReviewRepository;
    private final ReportRepository reportRepository;
    private final FavoriteRepository favoriteRepository;
    private final AgencyRepository agencyRepository;
    private final PropertyRepository propertyRepository;
    private final PasswordlessClient passwordlessClient; // PasswordlessService를 직접 주입하면 순환참조가 생겨서, 얘가 이미 쓰는 client를 그대로 가져옴
    private final RecentSearchRepository recentSearchRepository;
    private final RecommendationFeedbackRepository recommendationFeedbackRepository;
    private final RecommendationBestRepository recommendationBestRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    public Member findByEmail(String email){
        return memberRepository.findByEmail(email);
    }

    public Member findByPhone(String phone){
        return memberRepository.findByPhone(phone);
    }

    @Autowired // 필드 주입 : 맴버 변수에 직접 의존성을 주입하는 방식
    private PasswordEncoder passwordEncoder ;


    // insert() 안에서 Member 저장 + (중개인이면) Broker/Agency 저장까지 하나의 트랜잭션으로 묶는다.
    // @Transactional으로 트랜젝션 단위로 실패하면 member만 생기는 불상사 방지
    // dto -> Member 변환은 여기서 직접 한다
    @Transactional
    public void insert(SignupDto dto){
        Member member = new Member();
        member.setName(dto.getName());
        member.setPhone(dto.getPhone());
        member.setEmail(dto.getEmail());
        member.setAddress(dto.getAddress());
        // 주소 검색이 함께 준 지역 조각. 지도 검색의 기본 지역을 정할 때 쓴다.
        member.setSigungu(dto.getSigungu());
        member.setDong(dto.getDong());
        member.setRegdate(LocalDate.now());
        applyAgreements(member, dto);

        // 클라이언트가 role을 직접 정하게 하면 "ADMIN"을 보내는 식의 권한 상승이 가능해진다.
        // 그래서 role 자체는 안 받고, signupType이라는 제한된 값만 보고 서버가 role을 정한다.
        boolean isBroker = "BROKER".equals(dto.getSignupType());
        // socialToken이 있으면 소셜 가입이다. socialType/socialUserId는 dto가 아니라
        // 이 토큰 안의 값만 신뢰한다(클라이언트가 남의 소셜 계정을 사칭하지 못하게 하기 위함).
        boolean isSocial = dto.getSocialToken() != null && !dto.getSocialToken().isBlank();

        if (isBroker) {
            // 중개인은 비밀번호 없이 가입하고 이후 패스워드리스로만 로그인한다(또는 소셜)
            // DB에 저장하기 전에 먼저 필수값을 검증한다.
            validateBrokerFields(dto);
            member.setRole(Role.BROKER);
        } else {
            member.setRole(Role.USER);
        }

        if (isSocial) {
            // 소셜 가입은 일반/중개인 모두 비밀번호 자체가 없다.
            applySocialInfo(member, dto.getSocialToken());
            member.setPassword(null);
        } else if (isBroker) {
            // 자체 가입 중개인도 비밀번호 없이 가입한다(패스워드리스 전용).
            member.setPassword(null);
        } else {
            String password = dto.getPassword();

            // 규칙 검사는 PasswordPolicy 에 맡긴다.
            // 비밀번호 재설정(PasswordResetService)도 같은 메서드를 부르므로,
            // 규칙을 바꿀 일이 생기면 그 파일 한 곳만 고치면 양쪽에 함께 반영된다.
            PasswordPolicy.validate(password);

            member.setPassword(passwordEncoder.encode(password));
        }

        memberRepository.save(member);

        if (isBroker) {
            saveBrokerProfile(member, dto);
        }
    }

    // 약관 동의 내용을 member에 채운다.
    //
    // 필수 항목을 실제로 하나하나 확인하지는 않는다. 어떤 항목이 필수인지는 가입 유형마다
    // 다르고 그 목록을 화면(types/Terms.ts)이 갖고 있어서, 서버가 같은 목록을 또 들고 있으면
    // 약관이 바뀔 때마다 양쪽을 맞춰야 하기 때문이다.
    // 대신 termsVersion이 비어 있으면 "약관 화면을 거치지 않은 요청"으로 보고 막는다.
    // (동의 화면을 건너뛴 요청이 그대로 회원으로 저장되는 것만은 막자는 최소한의 방어다)
    private void applyAgreements(Member member, SignupDto dto){
        String termsVersion = dto.getTermsVersion();
        if (termsVersion == null || termsVersion.isBlank()) {
            throw new IllegalArgumentException("약관에 동의해야 회원가입을 진행할 수 있습니다.");
        }

        member.setTermsVersion(termsVersion);
        member.setAgreedAt(LocalDateTime.now());
        member.setAgreedMarketing(dto.isAgreedMarketing());
        member.setAgreedThirdParty(dto.isAgreedThirdParty());
    }

    // 소셜 가입 토큰(OAuth2LoginSuccessHandler가 발급)을 검증하고,
    // 그 안의 값으로 member의 소셜 연동 컬럼을 채운다.
    // dto의 socialType/socialUserId를 따로 받지 않는 이유는
    // 클라이언트가 그 값을 직접 적어 보내면 다른 사람의 소셜 계정을 가로챌 수 있기 때문이다.
    private void applySocialInfo(Member member, String socialToken){
        if (!jwtTokenProvider.validateToken(socialToken)
                || !jwtTokenProvider.isTokenType(socialToken, JwtTokenProvider.TYPE_SOCIAL_SIGNUP)) {
            throw new IllegalArgumentException("소셜 가입 인증이 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.");
        }

        Claims claims = jwtTokenProvider.getClaims(socialToken);
        SocialType socialType = SocialType.valueOf(claims.get("socialType", String.class));
        String socialUserId = claims.getSubject(); // 토큰 발급 시 subject에 socialUserId를 넣음

        // 그 사이(토큰 유효시간 안)에 같은 소셜 계정으로 이미 가입이 끝났을 수도 있으니 한 번 더 확인
        if (memberRepository.findBySocialTypeAndSocialUserId(socialType, socialUserId) != null) {
            throw new IllegalArgumentException("이미 가입된 소셜 계정입니다.");
        }

        member.setSocialType(socialType);
        member.setSocialUserId(socialUserId);
        member.setSocialEmail(claims.get("socialEmail", String.class));
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

        // 사무소 생성(좌표 조회 포함)은 AgencyService 가 맡는다.
        // 여기서 new Agency() 로 직접 만들면 좌표가 비어 지도에 표시되지 않는다.
        Agency agency = agencyService.createIfAbsent(
                member,
                dto.getAgencyName(),
                member.getName(),
                dto.getAgencyAddress(),
                dto.getAgencySigungu(),
                dto.getAgencyDong(),
                dto.getLicenseNumber());

        // 사무실 번호는 가입 폼에서만 받는 값이라 여기서 채운다.
        // 같은 트랜잭션 안이라 값만 바꿔도 커밋 시점에 UPDATE 가 실행된다.
        agency.setPhone(dto.getOfficePhone());
    }

    public Optional<Member> findMemberById(Long memberId){
        return this.memberRepository.findById(memberId);
    }

    // 로그인에 성공했을 때 발급한 refresh token 을 해당 회원 레코드에 저장하는 메소드.
    // @Transactional 을 붙여야 아래에서 값만 바꿔도 트랜잭션 종료 시 UPDATE 쿼리가 자동 실행
    @Transactional // 트랜젝션 시작
    public void updateRefreshToken(String email, String refreshToken){ // 매개변수: 회원 이메일, 새로 발급한 refresh token
        Member member = memberRepository.findByEmail(email); // 이메일로 회원을 조회함
        if(member == null){ // 혹시 회원이 없으면(비정상 상황)
            return; // 아무 것도 하지 않고 그냥 종료한다(NullPointerException 방지)
        }
        member.setRefreshToken(refreshToken); // 조회한 회원 객체의 refreshToken 필드를 새 값으로 바꾼다
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

    // 취향 초기 설정 화면(PreferenceSetupPage)에서 "메인으로 가기"를 누르면 호출된다.
    // 아직 실제 취향 설정 UI는 없어서, 이 호출 자체를 "완료"로 취급해 다음 로그인부터는 이 화면을 건너뛴다.
    @Transactional
    public void completePreferenceSetup(String email){
        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new EntityNotFoundException("회원 정보를 찾을 수 없습니다.");
        }
        member.setPreferenceCompleted(true);
    }

    // ===== 탈퇴 =====
    @Transactional
    public void withdrawal(Long memberId, String password){
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("회원 정보를 찾을 수 없습니다."));

        if (member.getRole() == Role.ADMIN) {
            throw new IllegalArgumentException("관리자 계정은 이 기능으로 탈퇴할 수 없습니다.");
        }

        // 비밀번호가 있는 계정만 재확인한다. 소셜/중개인처럼 비밀번호가 없는 계정은
        // 이미 JWT로 본인 확인이 끝난 상태라 건너뛴다.
        if (member.getPassword() != null) {
            if (password == null || !passwordEncoder.matches(password, member.getPassword())) {
                throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
            }
        }

        // 1) 콘텐츠는 남기고 작성자 연결만 끊는다 (리뷰·상담·신고)
        detachAuthoredContent(member.getId());

        // 2) 순수 개인화 데이터는 그냥 같이 삭제한다
        favoriteRepository.deleteAll(favoriteRepository.findByMember(member));
        member.getPreferredTags().clear(); // @ManyToMany 소유 쪽이라 clear()만 해도 member_tag 조인 행이 지워짐

        recentSearchRepository.deleteAll(recentSearchRepository.findByMemberId(member.getId()));
        recommendationFeedbackRepository.deleteAll(recommendationFeedbackRepository.findByMemberId(member.getId()));
        userPreferenceRepository.findByMemberId(member.getId()).ifPresent(userPreferenceRepository::delete);

    // RecommendationBest는 member_id 자체가 기본키(@MapsId)라, 있으면 그 id로 바로 지운다.
        if (recommendationBestRepository.existsById(member.getId())) {
            recommendationBestRepository.deleteById(member.getId());
        }

        // 3) 중개인이면 등록한 매물·사무소까지 정리한다
        if (member.getRole() == Role.BROKER) {
            withdrawBrokerAssets(member);
        }

        // 4) 패스워드리스에 등록돼 있었다면 해지한다
        if (member.isPasswordlessRegistered()) {
            boolean ok = passwordlessClient.withdrawal(member.getEmail());
            if (!ok) {
                throw new IllegalStateException("패스워드리스 해지에 실패해 탈퇴를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
            }
        }

        // 5) Member 행 자체를 삭제한다.
        // Broker는 Member.broker가 cascade=ALL + orphanRemoval=true라 여기서 자동으로 같이 지워진다.
        memberRepository.delete(member);
    }

    // 리뷰/상담/신고는 내용을 남기고 작성자 연결만 끊는다 (화면에서 "탈퇴한 회원"으로 표시됨)
    private void detachAuthoredContent(Long memberId){
        agencyReviewRepository.findByMemberId(memberId)
                .forEach(review -> review.setMember(null));
        agencyConsultationRepository.findByMemberIdOrderByCreatedAtDesc(memberId)
                .forEach(consultation -> consultation.setMember(null));
        propertyReviewRepository.findByMemberId(memberId)
                .forEach(review -> review.setMember(null));
        neighborhoodReviewRepository.findByMemberId(memberId)
                .forEach(review -> review.setMember(null));
        reportRepository.findByReporter_Id(memberId)
                .forEach(ReportEntity::detachReporter);
    }

    // 중개인 탈퇴: 등록한 매물과 사무소는 콘텐츠를 남길 대상 자체가 사라지므로 통째로 지운다
    private void withdrawBrokerAssets(Member member){
        agencyRepository.findByMemberId(member.getId()).ifPresent(agency -> {
            List<Property> properties = propertyRepository.findByAgencyId(agency.getId());
            for (Property property : properties) {
                favoriteRepository.deleteAll(favoriteRepository.findByProperty_Id(property.getId()));
                propertyReviewRepository.findByPropertyId(property.getId())
                        .forEach(propertyReviewRepository::delete);
                // property.images는 cascade=ALL+orphanRemoval이라 Property 삭제 시 자동으로 같이 지워지고
                // property.tags는 @ManyToMany 조인 테이블이라 별도 처리 없이 자동 정리된다.
            }
            propertyRepository.deleteAll(properties);

            agencyReviewRepository.findByAgencyIdOrderByIdDesc(agency.getId())
                    .forEach(agencyReviewRepository::delete);
            agencyConsultationRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId())
                    .forEach(agencyConsultationRepository::delete);

            agencyRepository.delete(agency);
        });
    }
}
