-- 중개사무소(agency) 예시 데이터
-- application.properties 의 spring.sql.init.mode=always 설정으로 서버가 시작될 때마다 실행된다.
-- (spring.jpa.defer-datasource-initialization=true 덕분에 Hibernate 가 테이블을 만든 뒤에 실행됨)
--
-- INSERT IGNORE : 같은 기본키(agency_id)가 이미 있으면 건너뛴다.
--                 그래서 서버를 여러 번 재시작해도 데이터가 중복으로 쌓이지 않는다.
--
-- verified 컬럼은 bit(1) 타입이라 b'1'(참) / b'0'(거짓) 으로 넣는다.
-- member_id 는 아직 연결할 중개인 계정이 없어서 NULL 로 둔다.
INSERT IGNORE INTO agency
    (agency_id, name, broker_name, address, phone, hours, latitude, longitude, verified, rating_avg, status, listing_count, regdate, member_id)
VALUES
    (1, '반포역전 공인중개사', '박지훈', '서울 서초구 신반포로 194', '02-533-1200', '09:00-19:00', 37.5085, 127.0117, b'1', 4.8, 'AVAILABLE', 24, CURRENT_DATE, NULL),
    (2, '서초센트럴 부동산',   '김서연', '서울 서초구 서초대로 396', '02-587-2300', '09:00-18:30', 37.4923, 127.0078, b'1', 4.6, 'AVAILABLE', 18, CURRENT_DATE, NULL),
    (3, '방배파크 공인중개사', '이민호', '서울 서초구 방배로 100',   '02-591-7788', '10:00-19:00', 37.4815, 126.9975, b'0', 4.3, 'RESERVED',  31, CURRENT_DATE, NULL),
    (4, '강남프라임 부동산',   '최유진', '서울 강남구 강남대로 396', '02-556-9900', '09:00-20:00', 37.4979, 127.0276, b'1', 4.9, 'AVAILABLE', 42, CURRENT_DATE, NULL);

-- 위에서 기본키를 1~4 로 직접 지정했기 때문에 꼭 필요한 처리.
--
-- Agency 엔터티가 @GeneratedValue(strategy = GenerationType.AUTO) 라서 Hibernate 는
-- agency_seq 테이블의 next_val 값을 보고 다음 기본키를 정한다.
-- 새 DB 에서는 이 값이 1 이라, 그대로 두면 나중에 중개사무소를 등록할 때
-- 이미 쓰고 있는 1번을 다시 만들려다 오류가 난다.
-- 그래서 예시 데이터보다 큰 값(101)으로 올려 둔다. 이미 큰 값이면 건드리지 않는다.
UPDATE agency_seq SET next_val = 101 WHERE next_val <= 100;

-- 태그(tag) 예시 데이터. 매물 등록 폼의 태그 선택 UI 확인용 (실제 카테고리별 목록은 팀장 확정 전이라 임시)
INSERT IGNORE INTO tag
    (id, name, category)
VALUES
    (1, '주차 가능',       'LIVING_ENVIRONMENT'),
    (2, '엘리베이터',       'LIVING_ENVIRONMENT'),
    (3, '반려동물 가능',    'LIVING_ENVIRONMENT'),
    (4, '풀옵션',          'LIVING_ENVIRONMENT'),
    (5, '남향',            'NATURAL_ENVIRONMENT'),
    (6, '한강뷰',          'NATURAL_ENVIRONMENT'),
    (7, '공원 인근',        'NATURAL_ENVIRONMENT'),
    (8, '지하철역 도보 5분', 'TRANSPORTATION'),
    (9, '버스정류장 인근',   'TRANSPORTATION'),
    (10, '조용한 분위기',   'ATMOSPHERE');

UPDATE tag_seq SET next_val = 101 WHERE next_val <= 100;