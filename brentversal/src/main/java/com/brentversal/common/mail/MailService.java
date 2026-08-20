package com.brentversal.common.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/*
  메일 발송 공통 서비스.

  spring-boot-starter-mail 과 spring.mail.* 설정은 예전부터 있었지만 실제로 메일을 보내는 코드는
  이 파일이 처음이다. 그래서 application.properties 의 값은 여전히 비어 있을 수 있다.

  [콘솔 폴백]
  MAIL_HOST 가 비어 있으면 실제 발송을 시도하지 않고 내용을 log.info 로 찍는다.
  팀원이 SMTP 계정을 따로 발급받지 않아도 인증번호를 콘솔에서 확인해 기능 흐름을 그대로 테스트할 수 있다.
  .env 에 MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD 를 채우면 그때부터 실제 메일이 나간다.

  [JavaMailSender 를 ObjectProvider 로 받는 이유]
  스프링은 spring.mail.host 가 없으면 JavaMailSender 를 자동 구성하지 않을 수 있다.
  생성자에서 그냥 주입받으면 빈이 없을 때 애플리케이션이 통째로 못 뜬다.
  (ML_BASE_URL 이 비어 있어 mlClient 빈 생성이 실패하면서 서버가 죽었던 것과 같은 유형이다)
  ObjectProvider 는 "있으면 쓰고 없으면 넘어가는" 형태라 그 사고를 구조적으로 막는다.
*/
@Slf4j
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    // 이 값이 비어 있으면 SMTP 설정이 안 된 것으로 보고 콘솔 폴백으로 동작한다.
    private final String host;

    // 발신자 주소. 따로 지정하지 않으면 로그인 계정(MAIL_USERNAME)을 그대로 쓴다.
    private final String from;

    public MailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.username:}") String username,
            @Value("${app.mail.from:}") String from) {

        this.mailSenderProvider = mailSenderProvider;
        this.host = host;
        // null 체크를 다른 조건 검사보다 먼저 수행한다
        this.from = (from == null || from.isBlank()) ? username : from;
    }

    // SMTP 설정이 실제로 채워져 있는지. 화면에 "메일을 보냈다"고 안내할지 판단할 때도 쓸 수 있다.
    public boolean isSmtpConfigured() {
        return host != null && !host.isBlank();
    }

    /*
      텍스트 메일 1통을 보낸다.

      메일 내용(제목·본문)을 이 클래스가 만들지 않고 호출하는 쪽에서 받는 이유는,
      common 패키지가 특정 도메인(비밀번호 재설정 등)의 문구를 알고 있을 필요가 없기 때문이다.
    */
    public void sendText(String to, String subject, String body) {
        // null 체크는 다른 조건 검사보다 먼저 수행한다
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("받는 사람 주소가 없습니다.");
        }

        if (!isSmtpConfigured()) {
            logToConsole(to, subject, body);
            return;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();

        // host 는 있는데 빈이 없는 경우(설정 오타 등). 서버를 죽이지 않고 콘솔로 흘려보낸다.
        if (sender == null) {
            log.warn("spring.mail.host 는 설정됐지만 JavaMailSender 빈이 없습니다. 콘솔 출력으로 대체합니다.");
            logToConsole(to, subject, body);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null && !from.isBlank()) {
            message.setFrom(from);
        }
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);

        // 외부 호출 중 오류가 날 수 있어 예외 처리 범위로 묶어둔다
        try {
            sender.send(message);
            log.info("메일 발송 완료. 받는 사람={}", to);
        } catch (MailException e) {
            // 원인(인증 실패/연결 거부 등)을 남겨야 배포 후 원격에서 진단할 수 있다
            log.error("메일 발송 실패. 받는 사람={}", to, e);
            throw new IllegalStateException("메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    // 개발용 폴백 출력. 인증번호가 본문에 들어 있으므로 이 로그만 보고도 테스트를 이어갈 수 있다.
    private void logToConsole(String to, String subject, String body) {
        log.info("[메일 설정 없음 - 콘솔 출력]\n받는 사람: {}\n제목: {}\n{}", to, subject, body);
    }
}
