package com.brentversal.member.controller;

import com.brentversal.common.config.JwtTokenProvider;
import com.brentversal.member.dto.LoginDto;
import com.brentversal.member.entity.Member;
import com.brentversal.member.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/member")
@RequiredArgsConstructor
public class MemberController {
    private final MemberService memberService ;

    private final AuthenticationManager authenticationManager ;
    private final JwtTokenProvider jwtTokenProvider ;

    @PostMapping("/login")
    // LoginDto의 데이터를 객체에 담으려고 @RequestBody 작성
    // Long타입과 String타입을 동시에 만족하는 타입은 Object타입이여서 Object타입도 적음
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginDto dto){
        // 인증 처리
        // 비밀번호가 틀리면 AuthenticationException 이 발생하는데, 잡지 않으면 500 으로 빠져나가
        // 클라이언트가 원인을 알 수 없다. 여기서 잡아 401 과 메시지로 돌려준다.
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


        // 사용자 정보 조회
        Member member = memberService.findByEmail(dto.getEmail());

        if(member == null){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "사용자 정보를 찾을 수 없습니다."));
        }else{
            // JWT 토큰 생성하기 (access token)
            String token = jwtTokenProvider.createToken(member);

            //  refresh token 도 함께 생성한다. access token 이 만료됐을 때 재로그인 없이 재발급받기 위함이다.
            String refreshToken = jwtTokenProvider.createRefreshToken(member); //  회원 정보로 refresh token 문자열을 만든다
            //  생성한 refresh token 을 DB(members.refresh_token)에 저장한다.
            //  서버가 저장해 두어야 나중에 재발급 요청이 들어왔을 때 "우리가 발급한 게 맞는지" 대조할 수 있다.
            memberService.updateRefreshToken(member.getEmail(), refreshToken); //  이메일 기준으로 해당 회원에 refresh token 저장

            // 응답
            // refreshToken 포함
            // 프론트는 이 값을 localStorage 에 저장해 둔다.
            return ResponseEntity.ok(Map.of("accessToken", token,
                    "refreshToken", refreshToken, //  프론트가 저장할 refresh token
                    "id", member.getId(),
                    "name", member.getName(), "email", member.getEmail(),
                    "role", member.getRole().toString())) ;
        }


    }

    // access token 이 만료되면 프론트(axiosInstance)가 저장해 둔 refresh token 을 이 엔드포인트로 보낸다.
    // 여기서 refresh token 의 유효성과 DB 저장값 일치를 확인한 뒤, 새 access token 을 발급해 돌려준다.
    @PostMapping("/refresh") // POST /member/refresh 요청을 처리한다
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request){ //  요청 본문에서 { "refreshToken": "..." } 를 받는다
        String refreshToken = request.get("refreshToken"); // 본문에서 refreshToken 값을 꺼낸다

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
        return ResponseEntity.ok(Map.of("accessToken", newAccessToken)); // 새 access token 을 응답 본문에 담아 200 반환
    }

    // @RequestBody : 넘어온 request정보가 JSON형식인데 그것을 Java 형식으로 바꿔주는 것
    // 원래 VSC(React-프론트앤드)에서 넘어온 데이터는 bean.getName같은거에 있음
    // Controller까지는 그대로의 데이터이고 그 이후인 Service에서 암호화를 하든 말든 함
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody Member bean, BindingResult bindingResult){ // 회원 가입하기
        System.out.println("회원 가입 정보");
        System.out.println(bean);

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
        Member member = memberService.findByEmail(bean.getEmail());
        if (member != null){ // member가 null이 아니라는 것은 이미 존재하는 id(맴버)라는 것을 의미함
            // 이미 존재하는 이메일 주소
            return new ResponseEntity<>(Map.of("email", "이미 존재하는 이메일 주소입니다."),
                    HttpStatus.BAD_REQUEST);
        }

        // 회원 가입 처리
        memberService.insert(bean);
        return new ResponseEntity<>("회원 가입 성공", HttpStatus.OK) ; // 회원 가입 성공 (OK라는건 200번대라는 뜻)
    }
}
