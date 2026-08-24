package com.brentversal.common.ml;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Map;

// Spring에서 FastAPI의 시세예측·추천·관리자 ML API를 HTTP로 호출하는 공통 Client 클래스임
@Component
public class MlClient {

    private final RestClient restClient;

    public MlClient(@Value("${ml.base-url:http://127.0.0.1:8000}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    // Spring에서 FastAPI 시세예측 API를 호출하고 응답 DTO로 받는 메서드임
    public MlPriceResponse predictPrice(MlPriceRequest request) {
        // 시세예측 POST 요청을 /ml/price/predict로 보내고 응답 DTO로 변환함
        return restClient.post()
                .uri("/ml/price/predict")
                .body(request)
                .retrieve()
                .body(MlPriceResponse.class);
    }

    // Spring에서 FastAPI 맞춤추천 API를 호출하고 JSON 결과를 받는 메서드임
    public Map<String, Object> recommend(Map<String, Object> request) {
        // 맞춤추천 POST 요청을 /ml/recommendation/recommend로 보내고 Map 응답으로 변환함
        return restClient.post()
                .uri("/ml/recommendation/recommend")
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    // Spring에서 adminCode(행정동 코드)를 받아 FastAPI 행정동 분석 API를 호출하고 결과 JSON을 반환하는 메서드임
    public Map<String, Object> neighborhood(String adminCode) {
        // 행정동 분석 GET 요청을 /ml/neighborhood/{adminCode}로 보내고 Map 응답으로 변환함
        return restClient.get()
                .uri("/ml/neighborhood/{adminCode}", adminCode)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /*
      위경도 좌표가 속한 행정동을 FastAPI에 물어 코드·이름을 받는 메서드임.

      매물 등록은 시세예측 응답에 행정동이 함께 실려 오므로 이 메서드를 쓰지 않는다.
      행정동을 저장하기 전에 등록된 예전 매물을 채워 넣을 때(백필)만 사용한다.
      서울 경계 밖이면 FastAPI가 404를 주고, 이 메서드는 null 을 돌려준다.
    */
    public Map<String, Object> resolveAdminDong(double latitude, double longitude) {
        // 좌표 판정 GET 요청을 /ml/neighborhood/resolve로 보내고 Map 응답으로 변환함
        try {
            return restClient.get()
                    .uri(builder -> builder.path("/ml/neighborhood/resolve")
                            .queryParam("lat", latitude)
                            .queryParam("lng", longitude)
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (HttpClientErrorException.NotFound e) {
            // 서울 경계 밖 좌표는 오류가 아니라 "해당 없음"이므로 호출한 쪽이 건너뛰게 함
            return null;
        }
    }

    // 매물 좌표 주변의 지하철·버스·병원·편의점을 좌표와 함께 받아오는 메서드임
    // 매물 상세 지도에 표시할 값이며, 반경은 FastAPI가 시세예측과 같은 기준으로 정한다.
    public Map<String, Object> nearbyPlaces(double latitude, double longitude) {
        // 주변시설 GET 요청을 /ml/place/nearby로 보내고 Map 응답으로 변환함
        return restClient.get()
                .uri(builder -> builder.path("/ml/place/nearby")
                        .queryParam("lat", latitude)
                        .queryParam("lng", longitude)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /*
      법정동(자치구+동 이름)으로 행정동 AI 분석 결과를 받아오는 메서드임.

      동네 탐색은 법정동 기준이고 이 분석은 행정동 기준이라 이름이 다르다.
      매핑을 못 찾거나(법정동-행정동 매핑 없음) 분석 결과가 없으면 파이썬이 404를 주고,
      이 메서드는 null 을 돌려준다. 호출한 쪽이 "이 동네는 아직 AI 분석에 연결되지 않았다"로 처리한다.
    */
    public Map<String, Object> neighborhoodByLegal(String district, String legalDong) {
        // 법정동 조회 GET 요청을 /ml/neighborhood/by-legal로 보내고 Map 응답으로 변환함
        try {
            return restClient.get()
                    .uri(builder -> builder.path("/ml/neighborhood/by-legal")
                            .queryParam("district", district)
                            .queryParam("legalDong", legalDong)
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    /*
      AI 챗봇 대화를 FastAPI에 넘기고 답변을 받아오는 메서드임.

      다른 ML 호출과 달리 FastAPI가 이 요청을 처리하는 도중 Spring으로 되돌아온다.
      질문에 필요한 매물을 찾으려면 DB가 있어야 하는데 FastAPI에는 DB가 없기 때문이다.
      그래서 요청에 사용자 토큰을 함께 실어 보내고, FastAPI는 그 토큰으로 매물 API를 호출한다.
      챗봇이 사용자보다 큰 권한을 갖지 않게 하려고 새 토큰을 만들지 않고 받은 것을 그대로 넘긴다.
    */
    public Map<String, Object> chat(Map<String, Object> request) {
        // 챗봇 POST 요청을 /ml/chat으로 보내고 Map 응답으로 변환함
        return restClient.post()
                .uri("/ml/chat")
                .body(request)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    // Spring에서 FastAPI 관리자 ML 상태 API를 호출하는 메서드임
    public Map<String, Object> adminStatus() {
        // 관리자 ML 상태 GET 요청을 /ml/admin/status로 보내고 Map 응답으로 변환함
        return restClient.get()
                .uri("/ml/admin/status")
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
}