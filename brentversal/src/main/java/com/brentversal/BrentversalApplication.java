package com.brentversal;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BrentversalApplication {

	public static void main(String[] args) {
		// .env 를 Spring 컨텍스트 시작 전에 로딩해 시스템 프로퍼티로 주입
		// 이렇게 해야 application*.properties 의 ${DB_URL}, ${JWT_EXPIRATION} 등을 읽을 수 있음
		Dotenv dotenv = Dotenv.configure()
				.directory("./") // 실행 위치인 brentversal/ 로 가서 .env를 읽음
				.ignoreIfMissing() //운영(Docker) 등 .env 가 없는 환경에서는 무시하고 실제 OS 환경변수를 사용한다
				.load();

		dotenv.entries().forEach(entry -> {
			// 이미 실제 환경변수/시스템 프로퍼티로 지정된 값이 있으면 덮어쓰지 않는다.
			// (운영 환경에서 주입한 값이 로컬 .env 값보다 우선하도록 보호)
			if (System.getProperty(entry.getKey()) == null
					&& System.getenv(entry.getKey()) == null) {
				System.setProperty(entry.getKey(), entry.getValue());
			}
		});

		SpringApplication.run(BrentversalApplication.class, args);
	}

}
