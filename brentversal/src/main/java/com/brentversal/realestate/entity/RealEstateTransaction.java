package com.brentversal.realestate.entity;

import com.brentversal.realestate.dto.MolitApartmentTradeItem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

@Getter
@Entity
@Table(
        name = "real_estate_transactions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_real_estate_source_item",
                columnNames = {"source_name", "source_item_id"}
        ),
        indexes = @Index(
                name = "idx_real_estate_region_date",
                columnList = "region_code, deal_date"
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RealEstateTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long id;

    @Column(name = "source_name", length = 50, nullable = false)
    private String sourceName;

    @Column(name = "source_item_id", length = 64, nullable = false)
    private String sourceItemId;

    @Column(name = "source_url", length = 500, nullable = false)
    private String sourceUrl;

    @Column(name = "region_code", length = 5, nullable = false)
    private String regionCode;

    @Column(name = "dong_name", length = 100)
    private String dongName;

    @Column(name = "apartment_name", length = 200, nullable = false)
    private String apartmentName;

    @Column(name = "lot_number", length = 100)
    private String lotNumber;

    @Column(name = "deal_price", nullable = false)
    private Long dealPrice;

    @Column(name = "area", precision = 10, scale = 2, nullable = false)
    private BigDecimal area;

    @Column(name = "floor")
    private Integer floor;

    @Column(name = "built_year")
    private Integer builtYear;

    @Column(name = "deal_date", nullable = false)
    private LocalDate dealDate;

    @Column(name = "dealing_type", length = 50)
    private String dealingType;

    @Column(name = "is_canceled", nullable = false)
    private boolean canceled;

    @Column(name = "cancellation_date")
    private LocalDate cancellationDate;

    @Lob
    @Column(name = "raw_data")
    private String rawData;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;

    public static RealEstateTransaction create(
            MolitApartmentTradeItem item,
            String sourceName,
            String sourceUrl,
            LocalDateTime collectedAt
    ) {
        RealEstateTransaction transaction = new RealEstateTransaction();
        transaction.sourceName = sourceName;
        transaction.sourceItemId = item.getSourceItemId();
        transaction.sourceUrl = sourceUrl;
        transaction.applyItem(item, collectedAt);
        return transaction;
    }

    public boolean updateFrom(
            MolitApartmentTradeItem item,
            LocalDateTime collectedAt
    ) {
        boolean changed = !Objects.equals(dongName, item.getDongName())
                || !Objects.equals(apartmentName, item.getApartmentName())
                || !Objects.equals(lotNumber, item.getLotNumber())
                || !Objects.equals(dealPrice, item.getDealPrice())
                || !Objects.equals(area, item.getArea())
                || !Objects.equals(floor, item.getFloor())
                || !Objects.equals(builtYear, item.getBuiltYear())
                || !Objects.equals(dealDate, item.getDealDate())
                || !Objects.equals(dealingType, item.getDealingType())
                || canceled != item.isCanceled()
                || !Objects.equals(cancellationDate, item.getCancellationDate());

        applyItem(item, collectedAt);
        return changed;
    }

    private void applyItem(
            MolitApartmentTradeItem item,
            LocalDateTime collectedAt
    ) {
        regionCode = item.getRegionCode();
        dongName = item.getDongName();
        apartmentName = item.getApartmentName();
        lotNumber = item.getLotNumber();
        dealPrice = item.getDealPrice();
        area = item.getArea();
        floor = item.getFloor();
        builtYear = item.getBuiltYear();
        dealDate = item.getDealDate();
        dealingType = item.getDealingType();
        canceled = item.isCanceled();
        cancellationDate = item.getCancellationDate();
        rawData = item.getRawData();
        this.collectedAt = collectedAt;
    }
}
