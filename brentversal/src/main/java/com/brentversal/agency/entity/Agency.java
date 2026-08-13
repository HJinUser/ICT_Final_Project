package com.brentversal.agency.entity;

import com.brentversal.agency.constant.AgencyStatus;
import com.brentversal.member.entity.Member;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

// 중개사무소 1곳을 의미하는 엔터티 클래스
@Getter @Setter @ToString @Entity
@Table(name = "agencies")
public class Agency {
    @Id // 프라이머리 키
    @GeneratedValue(strategy = GenerationType.AUTO) // 숫자 생성할때 AUTO로 생성하겠다.

    @Column(name = "agency_id") // pk 컬럼 이름 : 테이블단수명_id
    private Long id ;

    // 이 사무소를 등록한 중개인 (FK -> members 테이블)
    // 중개인 1명이 사무소 1개를 가지므로 member_id 에 unique 제약을 건다.
    // @ManyToOne 이지만 unique 제약으로 1:1 이 되는 방식 (@OneToOne 대신 쓰면 나중에 1:N 으로 넓히기 쉽다)
    // optional = true(기본값) : 관리자가 먼저 등록해 두고 나중에 중개인 계정을 연결할 수 있으므로 비어 있어도 된다.
    // FetchType.LAZY : 목록 조회 때마다 회원 정보까지 join 하지 않도록 지연 로딩으로 둔다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", unique = true)
    @ToString.Exclude // toString() 에서 회원까지 출력하면 지연 로딩이 강제로 실행되므로 제외한다
    private Member member ;

    @NotBlank(message = "중개사무소 이름은 필수 입력 사항입니다.")
    @Column(nullable = false)
    private String name ; // 예) "반포역전 공인중개사"

    @NotBlank(message = "공인중개사 이름은 필수 입력 사항입니다.")
    @Column(name = "broker_name", nullable = false)
    private String brokerName ; // 예) "박지훈"

    @NotBlank(message = "주소는 필수 입력 사항입니다.")
    @Column(nullable = false)
    private String address ; // 사무소 상세 페이지에 표시할 주소

    // 공인중개사 등록번호. 상세 페이지 기본 정보에 표시한다.
    // ERD 에는 없지만 화면(중개사무소 상세)에 필요해서 추가했다.
    @Column(name = "registration_no", length = 50)
    private String registrationNo ; // 예) "11650-2024-00123"

    // 사무소 외관·내부 대표 이미지 목록 (상세 페이지 갤러리용).
    // 이미지 몇 장을 순서대로 갖는 단순한 값 목록이라 별도 엔터티 대신 @ElementCollection 을 썼다.
    // agency_images 테이블이 자동으로 만들어지고, sort_order 컬럼으로 순서가 유지된다.
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "agency_images", joinColumns = @JoinColumn(name = "agency_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "image_url", length = 500)
    @ToString.Exclude
    private List<String> imageUrls = new ArrayList<>();

    // 숫자와 '-' 만 허용한다. 빈 값은 허용(@NotBlank 를 걸지 않음)하되 형식이 있으면 검사한다.
    @Pattern(regexp = "^$|^[0-9-]{9,20}$", message = "전화번호는 숫자와 '-' 로만 입력해 주세요.")
    private String phone ;

    @Size(max = 50, message = "영업시간은 50자 이하로 입력해 주세요.")
    private String hours ; // 예) "09:00-19:00"

    // ERD 의 lat_lng (위도·경도) 컬럼.
    // 한 컬럼에 문자열로 합쳐 두면 "지도 영역 안의 사무소 찾기" 같은 범위 검색을 할 수 없어서
    // 위도/경도를 각각 숫자 컬럼으로 나눠 저장한다. 카카오맵 마커 좌표로 그대로 쓸 수 있다.
    private Double latitude ;  // 위도 (예: 37.5085)
    private Double longitude ; // 경도 (예: 127.0117)

    @Column(nullable = false)
    private boolean verified = false ; // 관리자 인증 완료 여부 (화면의 인증 마크 발급 기준)

    @Column(name = "rating_avg", nullable = false)
    private Double ratingAvg = 0.0 ; // 이용자 평점 평균 (중개사무소 카드의 별점 표시용)

    // ERD 에는 없지만 화면에 필요해서 추가한 컬럼 2개
    @Enumerated(EnumType.STRING) // enum 이름(AVAILABLE 등)을 그대로 문자열로 저장한다
    @Column(nullable = false)
    private AgencyStatus status = AgencyStatus.AVAILABLE ; // 상담 가능 여부 배지

    // 등록 매물 건수.
    // 나중에 property(매물) 테이블이 생기면 count 쿼리로 계산하는 값이므로 이 컬럼은 그때 제거한다.
    @Column(name = "listing_count", nullable = false)
    private Integer listingCount = 0 ;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate regdate ; // 등록 일자
}
