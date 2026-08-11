package com.brentversal.property.entity;

import com.brentversal.agency.entity.Agency;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter @ToString @Entity
@Table(name = "property")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "property_id")
    private Long id;

    @Column(name = "neighborhood_id")
    private Long neighborhoodId;

    //     Agency와 Neighborhood 엔터티가 완성되면 위 Long agencyId와 Long neighborhoodId를 지우고 교체
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    private Agency agency;

//     @ManyToOne(fetch = FetchType.LAZY)
//     @JoinColumn(name = "neighborhood_id", nullable = false)
//     private Neighborhood neighborhood;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<PropertyImage> images = new ArrayList<>();

    @NotBlank(message = "매물명은 필수 입력 사항입니다.")
    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Lob
    @Column(name = "description")
    private String description;         // 소개 글

    @NotNull(message = "매물 유형은 필수 선택 사항입니다.")
    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 20, nullable = false)
    private PropertyType type;

    @NotNull(message = "거래 유형은 필수 선택 사항입니다.")
    @Enumerated(EnumType.STRING)
    @Column(name = "deal_type", length = 20, nullable = false)
    private DealType dealType;

    @NotBlank(message = "주소는 필수 입력 사항입니다.")
    @Column(name = "address", length = 200, nullable = false)
    private String address;

    private BigDecimal area;   // 전용면적(㎡)
    private Integer floor;     // 층수

    @NotNull(message = "방 개수는 필수 입력 사항입니다.")
    @Min(value = 1, message = "방 개수는 1개 이상이어야 합니다.")
    @Max(value = 6, message = "방 개수는 6개를 초과할 수 없습니다.")
    @Column(name = "room_count")
    private Integer roomCount; // 방 개수

    @NotNull(message = "욕실 개수는 필수 입력 사항입니다.")
    @Min(value = 1, message = "욕실 개수는 1개 이상이어야 합니다.")
    @Max(value = 3, message = "욕실 개수는 3개를 초과할 수 없습니다.")
    @Column(name = "bathroom_count")
    private Integer bathroomCount; // 욕실 개수

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

    @Column(name = "maintenance_fee")
    private Integer maintenanceFee; // 관리비(만 원)

    @Lob
    @Column(name = "detail_description")
    private String detailDescription;   // 상세 설명

    @Column(name = "move_in_date")
    private LocalDate moveInDate;        // 입주 가능일

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_status", length = 20)
    private ContractStatus contractStatus; // 계약 가능 상태

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private PropertyStatus status;

    @Column(name = "visible", nullable = false)
    private Boolean visible = true; // 공개/비공개 여부. 기본값은 공개(true)

    @Column(name = "ai_price")
    private Long aiPrice; // AI 예상 시세

    @Enumerated(EnumType.STRING)
    @Column(name = "price_status", length = 10)
    private PriceChangeStatus priceStatus; // 가장 최근 가격 수정의 방향. 수정 이력이 없거나 변동 없으면 null

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToMany
    @JoinTable(
            name = "property_tag",
            joinColumns = @JoinColumn(name = "property_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private List<Tag> tags = new ArrayList<>();

    @Transient
    private List<Long> tagIds; // 요청으로 들어온 태그 id 목록. 저장 전 서비스에서 실제 Tag로 변환됨

}