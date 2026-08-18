package com.brentversal;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
public class BrentversalApplication {

	// 스프링용 .env 는 brentversal/ 안에 둔다 (.env_sample 과 같은 자리, 팀 공지 기준).
	// frentversal(React), prentversal(Python) 에도 각자 .env 가 있으므로 섞이면 안 된다.
	// 아래 후보에는 그 두 폴더가 없으니 다른 모듈의 .env 를 잘못 읽을 일은 없다.
	//
	// 후보가 둘인 이유는 파일이 두 곳에 있어서가 아니라, 같은 파일에 닿는 경로가
	// 실행 방법에 따라 달라지기 때문이다.
	// application*.properties 는 클래스패스에서 읽어 실행 위치와 무관하지만,
	// .env 는 파일시스템에서 직접 읽어 "실행할 때의 작업 디렉터리"에 걸린다.
	//   - "brentversal" : 작업 디렉터리가 프로젝트 루트일 때 (IntelliJ 기본값)
	//   - "."           : 작업 디렉터리가 brentversal 일 때 (터미널 ./mvnw spring-boot:run)
	// 둘 다 결국 brentversal/.env 를 가리킨다. 공지된 위치를 먼저 찾도록 순서를 둔다.
	private static final List<String> ENV_DIRECTORIES = List.of("brentversal", ".");

	public static void main(String[] args) {
		loadDotenv();

		SpringApplication.run(BrentversalApplication.class, args);
	}

	// .env 를 Spring 컨텍스트 시작 전에 읽어 시스템 프로퍼티로 넣는다.
	// 이렇게 해야 application*.properties 의 ${KAKAO_CLIENT_ID} 같은 값이 치환된다.
	private static void loadDotenv() {
		for (String directory : ENV_DIRECTORIES) {
			Path envFile = Path.of(directory, ".env");

			if (!Files.isRegularFile(envFile)) continue;

			Dotenv dotenv = Dotenv.configure()
					.directory(directory)
					.ignoreIfMissing()
					.load();

			dotenv.entries().forEach(entry -> {
				// 이미 실제 환경변수/시스템 프로퍼티로 지정된 값이 있으면 덮어쓰지 않는다.
				// (운영 환경에서 주입한 값이 로컬 .env 값보다 우선하도록 보호)
				if (System.getProperty(entry.getKey()) == null
						&& System.getenv(entry.getKey()) == null) {
					System.setProperty(entry.getKey(), entry.getValue());
				}
			});

			System.out.println("[.env] 읽음 : " + envFile.toAbsolutePath());
			return;
		}

		// 운영(Docker) 등 .env 없이 실제 환경변수를 쓰는 환경도 있으므로 실패로 보지 않는다.
		// 다만 로컬에서 이 문구가 보이면 소셜 로그인·지오코딩이 조용히 동작하지 않으므로 알려 준다.
		System.out.println("[.env] 파일을 찾지 못했습니다. OS 환경변수를 사용합니다."
				+ " 스프링용 .env 는 brentversal 폴더 안(.env_sample 과 같은 자리)에 두세요."
				+ " frentversal(React)·prentversal(Python) 의 .env 와는 별개입니다."
				+ " (현재 작업 디렉터리: " + Path.of("").toAbsolutePath() + ")");
	}

}
