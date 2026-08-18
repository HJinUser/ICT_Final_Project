package com.brentversal.neighborhood.entity;

import com.brentversal.tag.entity.Tag;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@ToString
@Entity
@Table(
        name = "neighborhoods",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_neighborhood_district_dong",
                columnNames = {"city", "district", "dong"}
        )
)
public class Neighborhood {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "neighborhood_id")
    private Long id;

    @NotBlank(message = "시·도는 필수입니다.")
    @Size(max = 30, message = "시·도는 30자 이하로 입력해 주세요.")
    @Column(nullable = false, length = 30)
    private String city;

    @NotBlank(message = "시·군·구는 필수입니다.")
    @Size(max = 30, message = "시·군·구는 30자 이하로 입력해 주세요.")
    @Column(nullable = false, length = 30)
    private String district;

    @NotBlank(message = "읍·면·동은 필수입니다.")
    @Size(max = 30, message = "읍·면·동은 30자 이하로 입력해 주세요.")
    @Column(nullable = false, length = 30)
    private String dong;

    @Size(max = 500, message = "동네 소개는 500자 이하로 입력해 주세요.")
    @Column(length = 500)
    private String description;

    @Size(max = 500, message = "이미지 주소는 500자 이하로 입력해 주세요.")
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    // 평균 전세가·인기도는 저장하지 않는다. 동네에 매물이 새로 등록/거래되거나 찜이 바뀔 때마다
    // 값을 다시 계산해 넣어 줘야 하는데, 그 갱신을 깜빡하면 "카드에는 5.1억인데 실제 매물은 다르다"는
    // 식으로 어긋난다(과거 Agency.listingCount가 그래서 죽은 컬럼이 됐다).
    // 그래서 propertyCount와 똑같이 조회 시점에 매물·찜 테이블을 직접 집계해서 채운다
    // (NeighborhoodService.toResponse 참고).

    @Column(nullable = false)
    private boolean visible = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "neighborhood_tags",
            joinColumns = @JoinColumn(name = "neighborhood_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_neighborhood_tags",
                    columnNames = {"neighborhood_id", "tag_id"}
            )
    )
    @ToString.Exclude
    private Set<Tag> tags = new LinkedHashSet<>();

    public void toggleVisibility() {
        this.visible = !this.visible;
    }
}
