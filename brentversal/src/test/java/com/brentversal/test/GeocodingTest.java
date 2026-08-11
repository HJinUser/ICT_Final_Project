package com.brentversal.test;

import com.brentversal.common.geocoding.KakaoGeocodingService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

// 주소 -> 좌표 변환(지오코딩)이 실제로 동작하는지 확인하는 테스트
//
// @SpringBootTest 를 쓰지 않는 이유:
//   .env 는 BrentversalApplication.main() 에서 읽어 시스템 프로퍼티로 넣는데,
//   테스트는 main() 을 거치지 않아 키가 비어 있는 상태로 뜬다.
//   그래서 여기서는 .env 를 직접 읽어 서비스를 만들어 확인한다.
//   (실제 앱에서는 main() 이 .env 를 읽으므로 소셜 로그인 키와 똑같이 동작한다)
//
// 카카오 서버에 실제 요청을 보내므로, 키가 없거나 인터넷이 안 되는 환경에서는
// 실패가 아니라 '건너뜀'으로 처리한다. (팀원 환경에서 빌드가 깨지지 않게 하기 위함)
public class GeocodingTest {

    // .env 에서 카카오 REST API 키를 읽는다.
    // 카카오는 소셜 로그인 client-id 와 REST API 키가 같은 값이라 KAKAO_CLIENT_ID 도 함께 본다.
    private String readKeyFromEnv() {
        Path envFile = Path.of(".env");

        if (!Files.exists(envFile)) return "";

        try {
            for (String line : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
                if (line.startsWith("KAKAO_REST_API_KEY=") || line.startsWith("KAKAO_CLIENT_ID=")) {
                    String value = line.substring(line.indexOf('=') + 1).trim();
                    if (!value.isBlank()) return value;
                }
            }
        } catch (IOException e) {
            return "";
        }

        return "";
    }

    @Test
    @DisplayName("주소를 넣으면 위도·경도를 찾아온다")
    void findCoordinates(){
        String key = readKeyFromEnv();
        Assumptions.assumeFalse(key.isBlank(), "카카오 REST API 키가 없어 이 테스트는 건너뜁니다.");

        KakaoGeocodingService service = new KakaoGeocodingService(key);

        Optional<KakaoGeocodingService.Coordinates> found =
                service.findCoordinates("서울 서초구 신반포로 194");

        Assertions.assertTrue(found.isPresent(), "주소로 좌표를 찾을 수 있어야 한다");

        KakaoGeocodingService.Coordinates coordinates = found.get();
        System.out.println("찾은 좌표 : 위도 " + coordinates.latitude() + ", 경도 " + coordinates.longitude());

        // 대한민국 안의 좌표인지 대략적으로 확인한다 (위도 33~39, 경도 124~132)
        Assertions.assertTrue(coordinates.latitude() > 33 && coordinates.latitude() < 39);
        Assertions.assertTrue(coordinates.longitude() > 124 && coordinates.longitude() < 132);
    }

    @Test
    @DisplayName("주소가 비어 있거나 키가 없으면 오류 없이 빈 값을 돌려준다")
    void emptyCases(){
        // 키가 없는 상태로 만들어도 예외가 나면 안 된다 (팀원 환경 대비)
        KakaoGeocodingService noKey = new KakaoGeocodingService("");
        Assertions.assertTrue(noKey.findCoordinates("서울 서초구 신반포로 194").isEmpty());

        String key = readKeyFromEnv();
        KakaoGeocodingService service = new KakaoGeocodingService(key);

        // 빈 주소는 조회 자체를 하지 않는다
        Assertions.assertTrue(service.findCoordinates("").isEmpty());
        Assertions.assertTrue(service.findCoordinates(null).isEmpty());

        // 존재하지 않는 주소를 넣어도 예외가 나지 않고 빈 값이 나와야 한다.
        // (좌표를 못 찾는다고 사무소 저장이 실패하면 안 되기 때문)
        Assumptions.assumeFalse(key.isBlank(), "카카오 REST API 키가 없어 이 부분은 건너뜁니다.");
        Assertions.assertTrue(service.findCoordinates("ㅁㄴㅇㄹㅁㄴㅇㄹ존재하지않는주소12345").isEmpty());
    }
}
