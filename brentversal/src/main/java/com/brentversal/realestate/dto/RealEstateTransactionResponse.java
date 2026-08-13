package com.brentversal.realestate.dto;

import com.brentversal.realestate.entity.RealEstateTransaction;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class RealEstateTransactionResponse {

    private final Long id;
    private final String sourceName;
    private final String sourceUrl;
    private final String regionCode;
    private final String dongName;
    private final String apartmentName;
    private final String lotNumber;
    private final Long dealPrice;
    private final BigDecimal area;
    private final Integer floor;
    private final Integer builtYear;
    private final LocalDate dealDate;
    private final String dealingType;
    private final boolean canceled;
    private final LocalDate cancellationDate;
    private final LocalDateTime collectedAt;

    public static RealEstateTransactionResponse from(
            RealEstateTransaction transaction
    ) {
        return new RealEstateTransactionResponse(
                transaction.getId(),
                transaction.getSourceName(),
                transaction.getSourceUrl(),
                transaction.getRegionCode(),
                transaction.getDongName(),
                transaction.getApartmentName(),
                transaction.getLotNumber(),
                transaction.getDealPrice(),
                transaction.getArea(),
                transaction.getFloor(),
                transaction.getBuiltYear(),
                transaction.getDealDate(),
                transaction.getDealingType(),
                transaction.isCanceled(),
                transaction.getCancellationDate(),
                transaction.getCollectedAt()
        );
    }
}
