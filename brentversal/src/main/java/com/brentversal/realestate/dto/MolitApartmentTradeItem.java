package com.brentversal.realestate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class MolitApartmentTradeItem {

    private final String sourceItemId;
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
    private final String rawData;
}
