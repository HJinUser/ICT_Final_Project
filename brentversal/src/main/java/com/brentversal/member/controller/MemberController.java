package com.brentversal.member.controller;

import com.brentversal.common.config.JwtTokenProvider;
import com.brentversal.member.dto.LoginDto;
import com.brentversal.member.dto.SignupDto;
import com.brentversal.member.entity.Member;
import com.brentversal.member.service.MemberService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/member")
@RequiredArgsConstructor
public class MemberController {
    private final MemberService memberService ;

    private final AuthenticationManager authenticationManager ;
    private final JwtTokenProvider jwtTokenProvider ;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    @Value("${app.cookie-secure}")
    private boolean cookieSecure;

    // refreshToken을 httpOnly 쿠키로 내려주는 공통 메소드.
    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(refreshExpiration / 1000) // ms → sec
                .build();
    }

    @PostMapping("/login")
    // LoginDto의 데이터를 객체에 담으려고 @RequestBody 작성
    // Long타입과 String타입을 동시에 만족하는 타입은 Object타입이여서 Object타입도 적음
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginDto dto, HttpServletResponse response){
        // 인증 처리
        // 비밀번호가 틀리면 AuthenticationException 이 발생하는데, 잡지 않으면 500 으로 빠져나가
        // 클라이언트가 원인을 알 수 없다. 여기서 잡아 401 과 메시지로 돌려준다.
        // 패스워드리스로 등록한 회원은 일반 로그인을 막는다.
        // 비밀번호 검증(AuthenticationManager)까지 가기 전에 걸러서,
        // 패스워드리스 전용 계정의 비밀번호 정답 여부가 새어 나가지 않게 한다.
        Member member = memberService.findByEmail(dto.getEmail());
        if (member != null && member.isPasswordlessRegistered()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "패스워드리스로 등록된 계정입니다. 패스워드리스 로그인을 이용해 주세요."));
        }

        // 인증 처리
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            dto.getEmail(),
                            dto.getPassword()
                    )
            );
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "이메일 또는 비밀 번호가 올바르지 않습니다."));
        }


        if(member == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "사용자 정보를 찾을 수 없습니다."));
        }else{
            // JWT 토큰 생성하기 (access token)
            String token = jwtTokenProvider.createToken(member);

            //  refresh token 도 함께 생성한다. access token 이 만료됐을 때 재로그인 없이 재발급받기 위함이다.
            String refreshToken = jwtTokenProvider.createRefreshToken(member); //  회원 정보로 refresh token 문자열을 만든다
            //  생성한 refresh token 을 DB(members.refresh_token)에 저장한다.
            //  서버가 저장해 두어야 나중에 재발급 요청이 들어왔을 때 "우리가 발급한 게 맞는지" 대조할 수 있다.
            memberService.updateRefreshToken(member.getEmail(), refreshToken); //  이메일 기준으로 해당 회원에 refresh token 저장

            response.addHeader(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString());

            // 응답
            return ResponseEntity.ok(Map.of("accessToken", token,
                    "id", member.getId(),
                    "name", member.getName(), "email", member.getEmail(),
                    "role", member.getRole().toString(),
                    // 회원가입 때 적은 주소와 거기서 뽑아 둔 구.
                    // 지도 검색을 열 때 이 지역 매물을 먼저 보여 주고, 지도 화면도 이 주소로 옮긴다.
                    // 주소를 입력하지 않은 회원은 값이 없으므로 빈 문자열로 내보낸다(Map.of 는 null 을 못 담는다).
                    "address", member.getAddress() == null ? "" : member.getAddress(),
                    "sigungu", member.getSigungu() == null ? "" : member.getSigungu(),
                    // 프론트가 일반 사용자(USER) + 미완료일 때만 취향 초기 설정 화면으로 보내는 데 쓴다.
                    "preferenceCompleted", member.isPreferenceCompleted(),
                    "socialType", member.getSocialType().toString())) ;
        }


    }

    // access token 이 만료되면 프론트(axiosInstance)가 저장해 둔 refresh token 을 이 엔드포인트로 보낸다.
    // 여기서 refresh token 의 유효성과 DB 저장값 일치를 확인한 뒤, 새 access token 을 발급해 돌려준다.
    @PostMapping("/refresh") // POST /member/refresh 요청을 처리한다
    public ResponseEntity<?> refresh(@CookieValue(name = "refreshToken", required = false) String refreshToken){ //  요청 본문에서 { "refreshToken": "..." } 를 받는다

        // 1) 값이 아예 없거나 빈 문자열이면 재발급 불가 → 401 반환
        if(refreshToken == null || refreshToken.isBlank()){ // null 체크를 다른 검사보다 먼저 수행한다
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED) // 401 Unauthorized 상태로
                    .body(Map.of("error", "refresh token이 없습니다.")); // 오류 메시지를 담아 반환
        }

        // 2) 서명/만료 검증. 만료됐거나 위·변조됐으면 false → 재발급 거부
        if(!jwtTokenProvider.validateToken(refreshToken)){ // refresh token 자체가 유효한 JWT 인지 확인
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED) // 유효하지 않으면 401
                    .body(Map.of("error", "유효하지 않은 refresh token입니다."));
        }

        // 2-1) refresh 전용 토큰이 맞는지 확인한다.
        // access token 도 같은 키로 서명되므로 종류 검사가 없으면 access token 으로도 재발급이 가능해진다.
        if(!jwtTokenProvider.isTokenType(refreshToken, JwtTokenProvider.TYPE_REFRESH)){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "refresh token 이 아닙니다."));
        }

        // 3) 토큰의 subject(이메일)로 회원을 조회한다
        String email = jwtTokenProvider.getEmail(refreshToken); // refresh token 에서 주인(이메일)을 꺼낸다
        Member member = memberService.findByEmail(email); //  그 이메일의 회원을 조회한다

        // 4) DB 에 저장된 refresh token 과 지금 들어온 값이 일치하는지 확인한다.
        //(로그아웃/재로그인/탈취로 서버 값이 바뀌었다면 옛 토큰은 거부하기 위한 대조)
        if(member == null || !refreshToken.equals(member.getRefreshToken())){ //  회원이 없거나 저장값과 다르면
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED) //  무효 처리 → 401
                    .body(Map.of("error", "만료되었거나 무효화된 refresh token입니다."));
        }

        // 5) 모든 검증 통과 → 새 access token 을 발급해서 돌려준다 (refresh token 은 그대로 재사용)
        String newAccessToken = jwtTokenProvider.createToken(member); // 회원 정보로 새 access token 생성
        return ResponseEntity.ok(Map.of("accessToken", newAccessToken,
                "id", member.getId(),
                "name", member.getName(), "email", member.getEmail(),
                "role", member.getRole().toString(),
                "address", member.getAddress() == null ? "" : member.getAddress(),
                "sigungu", member.getSigungu() == null ? "" : member.getSigungu(),
                "preferenceCompleted", member.isPreferenceCompleted(),
                "socialType", member.getSocialType().toString())); // 새 access token 을 응답 본문에 담아 200 반환
    }

    // 로그아웃: 로그인한 사용자의 refresh token 을 서버에서 지워 이후 재발급을 막는다.
    // Authentication 은 JwtAuthenticationFilter 가 SecurityContextHolder 에 넣어둔 인증 정보를
    // 스프링이 자동으로 이 파라미터에 주입해 준다. (SecurityConfig 의 permitUrls 에 이 경로를 넣지 않아야
    // 필터가 인증을 거치고, 이 파라미터가 null 이 아니게 된다.)
    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication authentication, HttpServletResponse response){
        String email = authentication.getName();
        memberService.clearRefreshToken(email);

        ResponseCookie expired = ResponseCookie.from("refreshToken", "")
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/").maxAge(0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, expired.toString());

        return ResponseEntity.ok(Map.of("message", "로그아웃 되었습니다."));

    }

    // 회원 탈퇴: 로그인한 본인만 자기 계정을 탈퇴할 수 있다.
// 비밀번호가 있는 계정이면 body의 password로 재확인하고 (없으면 MemberService가 그냥 건너뜀),
// 실제 삭제/연결 끊기 로직은 MemberService.withdrawal()에 다 있다.
    @PostMapping("/withdrawal")
    public ResponseEntity<?> withdrawal(Authentication authentication, @RequestBody Map<String, String> body){
        String email = authentication.getName(); // JwtAuthenticationFilter가 principal로 넣어둔 이메일
        Member member = memberService.findByEmail(email);
        if (member == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "회원 정보를 찾을 수 없습니다."));
        }

        try {
            memberService.withdrawal(member.getId(), body.get("password"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }

        return ResponseEntity.ok(Map.of("message", "탈퇴가 완료되었습니다."));
    }

    // @RequestBody : 넘어온 request정보가 JSON형식인데 그것을 Java 형식으로 바꿔주는 것
    // 일반 사용자/중개인 요청을 하나로 받아야 하고 Member 컬럼과 안 맞는 값(중개사무소 정보 등)도
    // 섞여 있어서, LoginDto처럼 전용 요청 DTO(SignupDto)로 받는다. Member로 변환하는 건 Service가 한다.
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupDto dto, BindingResult bindingResult){ // 회원 가입하기
        System.out.println("회원 가입 정보");
        System.out.println(dto);

        if(bindingResult.hasErrors()){ // 가입에 뭔가 문제 있음
            Map<String, String> errors = new HashMap<>();
            for(FieldError xx : bindingResult.getFieldErrors()){ // Field : Java에서의 변수 (name, password 등)
                errors.put(xx.getField(), xx.getDefaultMessage());
            }
            System.out.println(errors);
            return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
        }else{
            System.out.println("ok");
        }

        // 이메일 중복 체크
        Member member = memberService.findByEmail(dto.getEmail());
        if (member != null){ // member가 null이 아니라는 것은 이미 존재하는 id(맴버)라는 것을 의미함
            // 이미 존재하는 이메일 주소
            return new ResponseEntity<>(Map.of("email", "이미 존재하는 이메일 주소입니다."),
                    HttpStatus.BAD_REQUEST);
        }

        // 전화번호 중복 체크.
        Member phoneOwner = memberService.findByPhone(dto.getPhone());
        if (phoneOwner != null){
            return new ResponseEntity<>(Map.of("phone", "이미 존재하는 전화번호입니다."),
                    HttpStatus.BAD_REQUEST);
        }

        // 회원 가입 처리
        // insert()는 비밀번호 정책 위반뿐 아니라 중개인 가입의 필수값 누락(등록번호/사무소명 등)에서도
        // IllegalArgumentException을 던지므로, 특정 필드가 아니라 general 오류로 돌려준다.
        try {
            memberService.insert(dto);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(Map.of("general", e.getMessage()), HttpStatus.BAD_REQUEST);
        }

        // 중개인은 비밀번호 없이 가입하므로, 패스워드리스 등록 화면에서 본인 확인용으로 쓸 단기 토큰을 같이 내려준다.
        if ("BROKER".equals(dto.getSignupType())) {
            Member newMember = memberService.findByEmail(dto.getEmail());
            String signupToken = jwtTokenProvider.createBrokerSignupToken(newMember);
            return ResponseEntity.ok(Map.of(
                    "message", "회원 가입 성공",
                    "passwordlessSignupToken", signupToken
            ));
        }

        return new ResponseEntity<>("회원 가입 성공", HttpStatus.OK) ; // 회원 가입 성공 (OK라는건 200번대라는 뜻)
    }

    // 취향 초기 설정 완료 처리는 여기에 두지 않는다.
    //
    // 예전에는 이 자리에 PATCH /member/preference/complete 가 있었는데,
    // 그것만 직접 부르면 취향을 저장하지도, 샘플 매물을 평가하지도 않고
    // 완료 상태로 만들 수 있어서 초기설정을 건너뛰는 통로가 됐다.
    // 지금은 취향 저장과 평가를 모두 마친 뒤에만 부를 수 있도록
    // POST /recommendation/preference-complete 한 곳에서만 처리한다.
}
