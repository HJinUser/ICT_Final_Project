-- 중개사무소(agencies) 예시 데이터
-- application.properties 의 spring.sql.init.mode=always 설정으로 서버가 시작될 때마다 실행된다.
-- (spring.jpa.defer-datasource-initialization=true 덕분에 Hibernate 가 테이블을 만든 뒤에 실행됨)
--
-- INSERT IGNORE : 같은 기본키(agency_id)가 이미 있으면 건너뛴다.
--                 그래서 서버를 여러 번 재시작해도 데이터가 중복으로 쌓이지 않는다.
--
-- verified 컬럼은 bit(1) 타입이라 b'1'(참) / b'0'(거짓) 으로 넣는다.
-- member_id 는 아직 연결할 중개인 계정이 없어서 NULL 로 둔다.
INSERT IGNORE INTO agencies
    (agency_id, name, broker_name, address, phone, hours, registration_no, latitude, longitude, verified, rating_avg, status, regdate, member_id)
VALUES
    (1, '반포역전 공인중개사', '박지훈', '서울 서초구 신반포로 194', '02-533-1200', '09:00-19:00', '11650-2024-00123', 37.5085, 127.0117, b'1', 4.8, 'AVAILABLE', CURRENT_DATE, NULL),
    (2, '서초센트럴 부동산',   '김서연', '서울 서초구 서초대로 396', '02-587-2300', '09:00-18:30', '11650-2024-00087', 37.4923, 127.0078, b'1', 4.6, 'AVAILABLE', CURRENT_DATE, NULL),
    (3, '방배파크 공인중개사', '이민호', '서울 서초구 방배로 100',   '02-591-7788', '10:00-19:00', '11650-2023-00451', 37.4815, 126.9975, b'0', 4.3, 'RESERVED',  CURRENT_DATE, NULL),
    (4, '강남프라임 부동산',   '최유진', '서울 강남구 강남대로 396', '02-556-9900', '09:00-20:00', '11680-2024-00219', 37.4979, 127.0276, b'1', 4.9, 'AVAILABLE', CURRENT_DATE, NULL);

-- 등록번호 컬럼은 나중에 추가한 것이라, 이미 데이터가 들어 있는 DB 에서는 위 INSERT 가 건너뛰어진다.
-- 그래서 비어 있는 행만 따로 채워 준다.
UPDATE agencies SET registration_no = '11650-2024-00123' WHERE agency_id = 1 AND registration_no IS NULL;
UPDATE agencies SET registration_no = '11650-2024-00087' WHERE agency_id = 2 AND registration_no IS NULL;
UPDATE agencies SET registration_no = '11650-2023-00451' WHERE agency_id = 3 AND registration_no IS NULL;
UPDATE agencies SET registration_no = '11680-2024-00219' WHERE agency_id = 4 AND registration_no IS NULL;

-- 위에서 기본키를 1~4 로 직접 지정했기 때문에 꼭 필요한 처리.
--
-- Agency 엔터티가 @GeneratedValue(strategy = GenerationType.AUTO) 라서 Hibernate 는
-- agencies_seq 테이블의 next_val 값을 보고 다음 기본키를 정한다.
-- 새 DB 에서는 이 값이 1 이라, 그대로 두면 나중에 중개사무소를 등록할 때
-- 이미 쓰고 있는 1번을 다시 만들려다 오류가 난다.
-- 그래서 예시 데이터보다 큰 값(101)으로 올려 둔다. 이미 큰 값이면 건드리지 않는다.
UPDATE agencies_seq SET next_val = 101 WHERE next_val <= 100;

-- 태그(tags) 예시 데이터. 매물 등록 폼의 태그 선택 UI 확인용 (실제 카테고리별 목록은 팀장 확정 전이라 임시)
INSERT IGNORE INTO tags
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

-- 취향 초기 설정(온보딩) 1단계에서 고르는 키워드.
-- 목업 onboarding.html 의 키워드 목록을 옮긴 것이며, 위 1~10번과 뜻이 겹치는 항목은 새로 만들지 않고 그대로 쓴다.
--   조용한 동네 -> 10 조용한 분위기 / 역세권 -> 8 지하철역 도보 5분 / 채광 좋음 -> 5 남향
--   주차 가능 -> 1 / 반려동물 -> 3 반려동물 가능 / 공원 근처 -> 7 공원 인근
--
-- 분류(category)는 목업의 동네·매물·특수 3분류가 아니라 tags 테이블이 이미 쓰는 4분류를 따른다.
-- 동네 탐색 화면의 태그 탭이 이 분류를 기준으로 동작하고 있어서, 여기서만 다른 기준을 쓰면
-- 같은 태그가 화면마다 다른 묶음에 들어가 버리기 때문이다.
--
-- "병원 다수"와 "병원 근처"는 목업에 둘 다 있지만 사용자가 보기에 구분이 되지 않아 하나로 합쳤다.
INSERT IGNORE INTO tags
    (id, name, category)
VALUES
    (11, '높은 치안',      'ATMOSPHERE'),
    (12, '교육열 높음',     'ATMOSPHERE'),
    (13, '젊은층 선호',     'ATMOSPHERE'),
    (14, '노년층 선호',     'ATMOSPHERE'),
    (15, '냄새 적음',      'ATMOSPHERE'),
    (16, '저렴한 가격',     'LIVING_ENVIRONMENT'),
    (17, '넓은 평수',      'LIVING_ENVIRONMENT'),
    (18, '낮은 관리비',     'LIVING_ENVIRONMENT'),
    (19, '금연 구역',      'LIVING_ENVIRONMENT'),
    (20, '세탁소 근처',     'LIVING_ENVIRONMENT'),
    (21, '마트 근처',      'LIVING_ENVIRONMENT'),
    (22, '편의점 근처',     'LIVING_ENVIRONMENT'),
    (23, '병원 근처',      'LIVING_ENVIRONMENT'),
    (24, '학원가',         'LIVING_ENVIRONMENT'),
    (25, '즉시 입주',      'LIVING_ENVIRONMENT');

UPDATE tags_seq SET next_val = 101 WHERE next_val <= 100;

-- 예시 매물에 태그를 붙인다.
--
-- 태그를 붙이지 않으면 맞춤 추천에서 취향 태그 점수(12점)와 생활환경 점수가 모든 매물에서 0이 되어,
-- 무엇을 고르든 추천 순서가 똑같아진다. 매물마다 성격이 갈리도록 서로 다르게 준다.
--   1번 반포 리버뷰 : 한강 조망에 넓고 조용한 집
--   2번 잠원 한강   : 역이 가깝고 생활 편의가 좋은 집
--   3번 서초 센트럴 : 학원가와 병원이 가까운 집
--   4번 역삼 스카이 : 작지만 싸고 관리비가 낮은 집
INSERT IGNORE INTO property_tags (property_id, tag_id) VALUES
    (1, 6), (1, 7), (1, 10), (1, 17), (1, 5),
    (2, 8), (2, 1), (2, 21), (2, 22), (2, 2),
    (3, 24), (3, 23), (3, 12), (3, 8), (3, 4),
    (4, 16), (4, 18), (4, 25), (4, 9), (4, 22);

-- ────────────────────────────────────────────────────────────────
-- 동네 탐색 예시 데이터
-- 프런트에 임의 객체를 넣지 않고 실제 DB 컬럼 → DTO → API 응답 흐름을 확인하기 위한 데이터다.
-- ML 추천 결과는 포함하지 않으며, popularity_score 는 인기순 정렬용 운영 지표다.
-- ────────────────────────────────────────────────────────────────
-- 시세(average_jeonse_price)·인기도(popularity_score)는 더 이상 저장하지 않는다.
-- 조회할 때마다 매물·찜 테이블을 집계해서 계산한다(NeighborhoodService 참고).
INSERT IGNORE INTO neighborhoods
    (neighborhood_id, city, district, dong, description, image_url, visible)
VALUES
    (1, '서울시', '서초구', '반포동', '한강과 대형 상권을 함께 이용하기 좋은 주거 지역입니다.', NULL, b'1'),
    (2, '서울시', '서초구', '잠원동', '한강 접근성과 교통 편의가 균형을 이루는 지역입니다.', NULL, b'1'),
    (3, '서울시', '서초구', '서초동', '업무지구와 생활 편의시설 접근성이 좋은 지역입니다.', NULL, b'1'),
    (4, '서울시', '강남구', '역삼동', '지하철과 업무시설이 밀집한 직주근접 지역입니다.', NULL, b'1'),
    (5, '서울시', '송파구', '잠실동', '대형 공원과 쇼핑시설을 함께 이용할 수 있는 지역입니다.', NULL, b'1'),
    (6, '서울시', '마포구', '연남동', '골목 상권과 공원이 가까운 활기찬 주거 지역입니다.', NULL, b'1');

-- 팀 주소 표기 규칙을 "서울특별시"에서 "서울시"로 정리했다(daumPostcode.ts 참고).
-- INSERT IGNORE는 이미 있는 행을 건드리지 않으므로, 예전 값이 남아 있는 DB는 여기서 맞춰 준다.
UPDATE neighborhoods SET city = '서울시' WHERE city = '서울특별시';

UPDATE neighborhoods_seq SET next_val = 101 WHERE next_val <= 100;

INSERT IGNORE INTO neighborhood_tags (neighborhood_id, tag_id) VALUES
    (1, 5), (1, 6), (1, 7),
    (2, 6), (2, 7), (2, 8),
    (3, 1), (3, 8), (3, 9),
    (4, 4), (4, 8), (4, 9),
    (5, 2), (5, 7), (5, 9),
    (6, 3), (6, 7), (6, 10);

-- ────────────────────────────────────────────────────────────────
-- 중개사무소 대표 이미지 (상세 페이지 갤러리용)
-- agency_images 테이블은 Agency 엔터티의 @ElementCollection 이 자동으로 만든다.
-- 이 테이블에는 기본키가 없어서 INSERT IGNORE 로는 중복을 막을 수 없다.
-- 그래서 "같은 자리(agency_id + sort_order)에 값이 없을 때만 넣기" 방식으로 작성했다.
-- ────────────────────────────────────────────────────────────────
INSERT INTO agency_images (agency_id, sort_order, image_url)
SELECT 1, 0, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=70'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM agency_images WHERE agency_id = 1 AND sort_order = 0);
INSERT INTO agency_images (agency_id, sort_order, image_url)
SELECT 1, 1, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=70'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM agency_images WHERE agency_id = 1 AND sort_order = 1);
INSERT INTO agency_images (agency_id, sort_order, image_url)
SELECT 2, 0, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=70'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM agency_images WHERE agency_id = 2 AND sort_order = 0);
INSERT INTO agency_images (agency_id, sort_order, image_url)
SELECT 3, 0, 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=70'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM agency_images WHERE agency_id = 3 AND sort_order = 0);
INSERT INTO agency_images (agency_id, sort_order, image_url)
SELECT 4, 0, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=70'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM agency_images WHERE agency_id = 4 AND sort_order = 0);


-- ────────────────────────────────────────────────────────────────
-- 매물(properties) 예시 데이터
-- 중개사무소 상세 페이지의 "담당 매물" 영역을 확인하기 위한 최소한의 데이터다.
-- properties 테이블은 다른 팀원이 만든 것이라, 그쪽 예시 데이터와 겹치지 않도록 1~4번만 사용한다.
-- 금액 단위는 만원이다. (49000 = 4억 9,000만원)
-- created_at 을 NOW() 로 넣어서 "오늘 신규" 건수에도 잡히게 했다.
-- ────────────────────────────────────────────────────────────────
-- visible(공개 여부)은 나중에 추가된 컬럼이며 NOT NULL 이라 값을 꼭 넣어야 한다. b'1' = 공개
INSERT IGNORE INTO properties
    (property_id, agency_id, neighborhood_id, name, type, deal_type, address, area, floor, room_count, bathroom_count,
     price, deposit, monthly_deposit, monthly_rent, maintenance_fee, status, visible, ai_price, ai_deposit, ai_monthly_deposit, ai_monthly_rent, created_at)
VALUES
    (1, 1, NULL, '반포 리버뷰 84㎡',   'APARTMENT', 'JEONSE', '서울 서초구 반포동 30-1', 84, 12, 3, 2, NULL, 49000, NULL, NULL, 12, 'ACTIVE', b'1', NULL, 51000, NULL, NULL, NOW()),
    (2, 1, NULL, '잠원 한강 74㎡',     'APARTMENT', 'JEONSE', '서울 서초구 잠원동 12-3', 74,  8, 2, 1, NULL, 52000, NULL, NULL, 10, 'ACTIVE', b'1', NULL, 51500, NULL, NULL, NOW()),
    (3, 2, NULL, '서초 센트럴 59㎡',   'OFFICETEL', 'JEONSE', '서울 서초구 서초동 1305', 59,  5, 2, 1, NULL, 38000, NULL, NULL,  9, 'ACTIVE', b'1', NULL, 37500, NULL, NULL, NOW()),
    (4, 4, NULL, '역삼 스카이 45㎡',   'ONE_TWO_ROOM', 'MONTHLY', '서울 강남구 역삼동 736', 45, 3, 1, 1, NULL, NULL, 1000, 60, 7, 'ACTIVE', b'1', NULL, NULL, 1050, 62, NOW());

-- visible 컬럼이 나중에 추가되면서 기존 예시 매물은 0(비공개)으로 채워졌으므로 공개로 되돌린다.
UPDATE properties SET visible = b'1' WHERE property_id <= 4 AND visible = b'0';

-- 지도 검색의 핀 좌표.
-- 좌표가 비어 있으면 지도에 핀이 찍히지 않아서, 예시 매물만이라도 값을 채워 둔다.
-- (주소 -> 좌표 변환은 아직 매물 등록에 붙어 있지 않다. 그 처리가 생기면 이 UPDATE 는 지워도 된다)
UPDATE properties SET latitude = 37.5052, longitude = 127.0110 WHERE property_id = 1 AND latitude IS NULL;
UPDATE properties SET latitude = 37.5133, longitude = 127.0110 WHERE property_id = 2 AND latitude IS NULL;
UPDATE properties SET latitude = 37.4923, longitude = 127.0078 WHERE property_id = 3 AND latitude IS NULL;
UPDATE properties SET latitude = 37.5006, longitude = 127.0364 WHERE property_id = 4 AND latitude IS NULL;

-- agencies_seq 와 같은 이유로 properties_seq 도 예시 데이터보다 큰 값으로 올려 둔다.
UPDATE properties_seq SET next_val = 101 WHERE next_val <= 100;
-- 예시 매물을 동네 카드의 매물 건수와 연결한다.
UPDATE properties SET neighborhood_id = 1 WHERE property_id = 1;
UPDATE properties SET neighborhood_id = 2 WHERE property_id = 2;
UPDATE properties SET neighborhood_id = 3 WHERE property_id = 3;
UPDATE properties SET neighborhood_id = 4 WHERE property_id = 4;

-- agency_seq 와 같은 이유로 property_seq 도 예시 데이터보다 큰 값으로 올려 둔다.
UPDATE properties_seq SET next_val = 101 WHERE next_val <= 100;
