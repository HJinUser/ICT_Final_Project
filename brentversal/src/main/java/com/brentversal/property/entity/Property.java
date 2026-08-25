package com.brentversal.property.entity;

import com.brentversal.agency.entity.Agency;
import com.brentversal.neighborhood.entity.Neighborhood;
import com.brentversal.property.constant.*;
import com.brentversal.property_image.entity.PropertyImage;
import com.brentversal.tag.entity.Tag;
import jakarta.persistence.Entity;
import jakarta.persistence.*;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.Formula;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.property.validation.PropertyFinalValidation;

@Getter @Setter @ToString @Entity
@Table(name = "properties")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "property_id")
    private Long id;

    //     Agency와 Neighborhood 엔터티가 완성되면 위 Long agencyId와 Long neighborhoodId를 지우고 교체
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    private Agency agency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "neighborhood_id", nullable = false)
    private Neighborhood neighborhood;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<PropertyImage> images = new ArrayList<>();

    @NotBlank(
            message = "매물명은 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;         // 소개 글

    @NotNull(
            message = "매물 유형은 필수 선택 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 20, nullable = false)
    private PropertyType type;

    @NotNull(
            message = "거래 유형은 필수 선택 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "deal_type", length = 20, nullable = false)
    private DealType dealType;

    @NotBlank(
            message = "주소는 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Column(name = "address", length = 200, nullable = false)
    private String address;

    // 주소에서 뽑아 둔 지역 조각 (주소 검색이 함께 돌려주는 값).
    //
    // 주소를 도로명으로 통일하면서 주소 문자열에 동이 사라졌다("서울시 영등포구 당산로 222").
    // 지도에서 동네끼리 묶으려면 이 값이 있어야 한다.
    @Column(length = 30)
    private String sigungu; // 영등포구

    @Column(length = 30)
    private String dong;    // 당산동4가

    // 중개인이 입력한 주소를 Spring의 KakaoGeocodingService로 변환해 저장함
    @Column(name = "latitude")
    private Double latitude; // 매물 위도

    @Column(name = "longitude")
    private Double longitude; // 매물 경도

    /*
      매물 좌표가 속한 행정동. 위의 dong 은 법정동이라 이것과 다르다.

      법정동과 행정동은 경계가 서로 달라서 이름만으로는 짝지을 수 없다.
      한 법정동이 여러 행정동에 걸쳐 있는 경우가 467개 중 137개나 되기 때문이다.
      그래서 이름이 아니라 좌표로 판정해서(파이썬 admin_dong_service) 여기에 적어 둔다.

      이 값이 있어야 K-Means 동네 분석 화면에서 그 동네의 매물을 찾을 수 있다.
      좌표를 못 구했거나 서울 밖이면 null 이고, 그때는 기존대로 dong 으로만 찾는다.
    */
    @Column(name = "admin_code", length = 20)
    private String adminCode; // 11650560

    @Column(name = "admin_name", length = 30)
    private String adminName; // 반포1동

    @NotNull(
            message = "전용면적은 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    private BigDecimal area;   // 전용면적(㎡)

    @NotNull(
            message = "층수는 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    private Integer floor;     // 층수

    @NotNull(
            message = "방 개수는 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Min(
            value = 1,
            message = "방 개수는 1개 이상이어야 합니다.",
            groups = PropertyFinalValidation.class
    )
    @Max(
            value = 6,
            message = "방 개수는 6개를 초과할 수 없습니다.",
            groups = PropertyFinalValidation.class
    )
    @Column(name = "room_count")
    private Integer roomCount; // 방 개수

    @NotNull(
            message = "욕실 개수는 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Min(
            value = 1,
            message = "욕실 개수는 1개 이상이어야 합니다.",
            groups = PropertyFinalValidation.class
    )
    @Max(
            value = 3,
            message = "욕실 개수는 3개를 초과할 수 없습니다.",
            groups = PropertyFinalValidation.class
    )
    @Column(name = "bathroom_count")
    private Integer bathroomCount; // 욕실 개수

    // 건축 연도. 맞춤 추천에서 신축 여부를 판단하고, 시세 예측에서도 입력 값으로 쓴다.
    // 예전에 등록한 매물에는 값이 없을 수 있어서 필수로 두지 않는다.
    //
    // 위쪽 한계는 아직 다 짓지 않은 건물도 등록할 수 있게 다음 해까지 열어 둔다.
    // 오타로 먼 미래 연도가 들어가면 계속 신축으로 잡혀 추천이 왜곡되므로 위쪽도 막아 둔다.
    @NotNull(
            message = "건축년도는 필수 입력 사항입니다.",
            groups = PropertyFinalValidation.class
    )
    @Min(value = 1900, message = "건축 연도는 1900년 이후로 입력해 주세요.")
    @Max(value = 2100, message = "건축 연도를 다시 확인해 주세요.")
    @Column(name = "build_year")
    private Integer buildYear; // 건축 연도. 신축 기준 = 현재연도 - buildYear <= 5

    // 거래유형(dealType)에 따라 쓰이는 필드가 달라짐:
    // 매매(SALE)    → price 사용 (매매가, 만원)
    // 전세(JEONSE)  → deposit 사용 (전세가, 만원)
    // 월세(MONTHLY) → monthlyDeposit(월세 보증금, 만원) + monthlyRent(월세 금액, 만원) 둘 다 사용
    private Long price;          // 매매가(만원)
    private Long deposit;        // 전세가(만원)

    @Column(name = "monthly_deposit")
    private Long monthlyDeposit; // 월세 보증금(만원)

    @Column(name = "monthly_rent")
    private Long monthlyRent;    // 월세 금액(만원)

    @Formula("coalesce(price, deposit, coalesce(monthly_deposit,0) + coalesce(monthly_rent,0)*100)")
    private Long comparablePrice;

    @Column(name = "maintenance_fee")
    private Integer maintenanceFee; // 관리비(만 원)

    @Column(name = "ai_price")
    private Long aiPrice;              // AI 예상 매매가(만원)

    @Column(name = "ai_deposit")
    private Long aiDeposit;            // AI 예상 전세가(만원)

    @Column(name = "ai_monthly_deposit")
    private Long aiMonthlyDeposit;     // AI 예상 월세 보증금(만원)

    @Column(name = "ai_monthly_rent")
    private Long aiMonthlyRent;        // AI 예상 월세 금액(만원)

    @Column(name = "ai_recommend_score")
    private Double aiRecommendScore;   // AI 추천 점수. 다른 기능이 계산해서 저장하며, 계산 전에는 null

    @Lob
    @Column(name = "detail_description", columnDefinition = "TEXT")
    private String detailDescription;

    @Column(name = "move_in_date")
    private LocalDate moveInDate;        // 입주 가능일

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_status", length = 20)
    private ContractStatus contractStatus; // 계약 가능 상태

    // 거래 상태는 클라이언트가 보내는 값이 아니라 서버가 정한다(등록 시 PENDING, 이후 관리자 승인으로 ACTIVE).
    // 그런데 @Valid 검증은 서비스가 값을 채우기 전에 돌기 때문에, 기본값이 없으면
    // 요청 본문에 status 가 없다는 이유로 등록이 항상 400 으로 막힌다.
    // 그래서 "새 매물은 승인 대기로 시작한다"는 뜻을 기본값으로 적어 둔다.
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private PropertyStatus status = PropertyStatus.PENDING;

    @Column(name = "visible", nullable = false)
    private Boolean visible = true; // 공개/비공개 여부. 기본값은 공개(true)

    // 최근접 역까지 거리를 미터 단위로 저장할 컬럼 필드임
    @Column(name = "station_distance")
    private Double stationDistance; // 최근접 역까지 거리(m)

    @Enumerated(EnumType.STRING)
    @Column(name = "price_status", length = 10)
    private PriceChangeStatus priceStatus; // 가장 최근 가격 수정의 방향. 수정 이력이 없거나 변동 없으면 null

    @Enumerated(EnumType.STRING)
    @Column(name = "price_evaluation", length = 20)
    private PriceEvaluationStatus priceEvaluation;

    // Property의 최초 생성시각과 마지막 수정시각을 각각 저장하는 컬럼임
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 같은 매물에 같은 태그가 두 번 붙지 않도록 DB 가 막게 한다.
    //
    // 제약이 없으면 같은 (매물, 태그) 짝이 여러 줄 쌓일 수 있고, 그러면 태그를 세는 계산이
    // 실제보다 몇 배로 커진다. 실제로 예시 데이터를 넣는 SQL 이 서버를 켤 때마다 다시 실행되면서
    // 같은 행이 반복해서 쌓였고, 맞춤 추천의 "관심 태그 몇 개 일치"가 3개가 아니라 15개로 나왔다.
    @ManyToMany
    @JoinTable(
            name = "property_tags",
            joinColumns = @JoinColumn(name = "property_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_property_tags",
                    columnNames = {"property_id", "tag_id"}
            )
    )
    private List<Tag> tags = new ArrayList<>();

    @Transient
    private List<Long> tagIds; // 요청으로 들어온 태그 id 목록. 저장 전 서비스에서 실제 Tag로 변환됨

    @Transient
    private List<Long> keepImageIds; // 수정 시 유지할 기존 사진 id 목록. 여기 없는 기존 사진은 삭제됨

    // Property가 처음 저장될 때 생성·수정 시간을 자동으로 채우는 lifecycle 메서드임
    @PrePersist
    private void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;
    }

    // Property가 수정될 때 updatedAt을 현재 시각으로 갱신하는 lifecycle 메서드임
    @PreUpdate
    private void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}