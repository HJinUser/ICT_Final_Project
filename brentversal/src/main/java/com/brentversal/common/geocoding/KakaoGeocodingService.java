package com.brentversal.common.geocoding;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

// 주소를 위도·경도로 바꿔 주는 서비스 (지오코딩)
//
// 중개인이 사무소 주소를 저장하면 이 서비스가 카카오 로컬 API 에 주소를 물어보고,
// 돌려받은 좌표를 agency 테이블의 latitude/longitude 에 저장한다.
// 그래야 중개사무소 안내 페이지 지도에 마커가 찍힌다.
//
// 왜 서버에서 하는가:
//   1. REST API 키가 브라우저에 노출되면 안 된다 (도메인 제한이 없는 키라서 그대로 도용된다)
//   2. 주소가 바뀔 때 한 번만 조회하면 되므로, 화면을 열 때마다 부르는 것보다 훨씬 적게 쓴다
//   3. 중개인이 좌표를 직접 알 필요가 없다
@Slf4j
@Service
public class KakaoGeocodingService {

    // 카카오 로컬 API 주소
    private static final String KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/";

    // REST API 키. 카카오에서는 소셜 로그인 client-id 와 같은 값이다.
    // 키가 없으면(팀원 환경 등) 조회를 건너뛰고 빈 값을 돌려준다.
    private final String restApiKey;

    // RestClient : Spring 이 제공하는 HTTP 호출 도구. 외부 API 를 부를 때 쓴다.
    private final RestClient restClient;

    public KakaoGeocodingService(@Value("${kakao.rest-api-key:}") String restApiKey) {
        this.restApiKey = restApiKey;
        this.restClient = RestClient.builder().baseUrl(KAKAO_LOCAL_URL).build();

        // 키가 없으면 서버가 뜰 때 바로 알려 준다.
        //
        // 예전에는 매물·사무소를 실제로 저장해 봐야 알 수 있었고, 그마저도 SQL 로그 사이에
        // WARN 한 줄로 묻혔다. 그래서 "등록은 되는데 지도에 핀이 안 찍히는" 상태를
        // 한참 뒤에야 알아차렸다. 키 설정은 사람마다 다를 수 있으니 시작할 때 짚어 준다.
        if (restApiKey == null || restApiKey.isBlank()) {
            log.warn("[지오코딩] 카카오 REST API 키가 비어 있습니다. 주소를 좌표로 바꾸지 못해"
                    + " 새로 등록하는 매물·중개사무소가 지도에 표시되지 않습니다."
                    + " brentversal/.env 의 KAKAO_CLIENT_ID 를 확인하고,"
                    + " 실행 구성의 작업 디렉터리가 brentversal 인지 확인하세요.");
        }
    }

    // 주소 문자열을 좌표로 바꾼다.
    //
    // 두 단계로 시도한다.
    //   1) 주소 검색 : "서울 서초구 신반포로 194" 같은 정식 주소를 찾는다 (가장 정확)
    //   2) 키워드 검색 : 주소 검색이 실패하면 건물명·상호로 한 번 더 찾는다
    //      ("반포자이 아파트" 처럼 주소가 아닌 값을 입력했을 때를 위한 대비)
    //
    // 찾지 못하거나 오류가 나면 비어 있는 Optional 을 돌려준다.
    // 좌표를 못 구했다고 사무소 저장 자체가 실패하면 안 되기 때문이다.
    public Optional<Coordinates> findCoordinates(String address) {
        if (address == null || address.isBlank()) {
            return Optional.empty();
        }

        if (restApiKey == null || restApiKey.isBlank()) {
            log.warn("카카오 REST API 키가 없어 좌표 조회를 건너뜁니다. (kakao.rest-api-key)");
            return Optional.empty();
        }

        // 1) 주소 검색
        Optional<Coordinates> found = search("search/address.json", address);

        // 2) 주소로 못 찾으면 키워드로 다시 시도
        if (found.isEmpty()) {
            found = search("search/keyword.json", address);
        }

        if (found.isEmpty()) {
            log.info("좌표를 찾지 못했습니다. address={}", address);
        }

        return found;
    }

    // 카카오 로컬 API 를 실제로 호출하는 부분.
    // 응답은 { "documents": [ { "x": "경도", "y": "위도" }, ... ] } 형태다.
    private Optional<Coordinates> search(String path, String query) {
        try {
            String uri = UriComponentsBuilder.fromPath(path)
                    .queryParam("query", query)
                    .build()
                    .toUriString();

            Map<String, Object> response = restClient.get()
                    .uri(uri)
                    // 카카오는 "KakaoAK 키" 형식으로 인증한다
                    .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) return Optional.empty();

            // documents 는 검색 결과 목록이다. 첫 번째(가장 정확한) 것만 쓴다.
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> documents = (List<Map<String, Object>>) response.get("documents");

            if (documents == null || documents.isEmpty()) return Optional.empty();

            Map<String, Object> first = documents.get(0);

            // 카카오는 x=경도(longitude), y=위도(latitude) 로 돌려준다. 순서를 헷갈리기 쉬우니 주의.
            double longitude = Double.parseDouble(String.valueOf(first.get("x")));
            double latitude = Double.parseDouble(String.valueOf(first.get("y")));

            return Optional.of(new Coordinates(latitude, longitude));

        } catch (Exception e) {
            // 카카오 서버가 응답하지 않거나 키가 잘못된 경우.
            // 사무소 저장은 계속 진행되어야 하므로 기록만 남기고 넘어간다.
            log.warn("좌표 조회에 실패했습니다. path={}, message={}", path, e.getMessage());
            return Optional.empty();
        }
    }

    // 위도·경도 한 쌍을 담는 작은 타입.
    // record 는 값만 담는 클래스를 짧게 만들 때 쓴다(getter 가 자동으로 생긴다).
    public record Coordinates(double latitude, double longitude) { }
}
