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
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
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
        name = "neighborhood",
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

    @NotNull(message = "평균 만족도는 필수입니다.")
    @DecimalMin(value = "0.0", message = "평균 만족도는 0 이상이어야 합니다.")
    @DecimalMax(value = "5.0", message = "평균 만족도는 5 이하여야 합니다.")
    @Column(name = "satisfaction_avg", nullable = false)
    private Double satisfactionAvg = 0.0;

    @NotNull(message = "평균 전세가는 필수입니다.")
    @PositiveOrZero(message = "평균 전세가는 0 이상이어야 합니다.")
    @Column(name = "average_jeonse_price", nullable = false)
    private Long averageJeonsePrice = 0L;

    @NotNull(message = "인기도 점수는 필수입니다.")
    @PositiveOrZero(message = "인기도 점수는 0 이상이어야 합니다.")
    @Column(name = "popularity_score", nullable = false)
    private Integer popularityScore = 0;

    @Column(nullable = false)
    private boolean visible = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "neighborhood_tag",
            joinColumns = @JoinColumn(name = "neighborhood_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_neighborhood_tag",
                    columnNames = {"neighborhood_id", "tag_id"}
            )
    )
    @ToString.Exclude
    private Set<Tag> tags = new LinkedHashSet<>();

    public void toggleVisibility() {
        this.visible = !this.visible;
    }
}
