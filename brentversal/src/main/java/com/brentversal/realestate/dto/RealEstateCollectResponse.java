package com.brentversal.realestate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RealEstateCollectResponse {

    private final String regionCode;
    private final String dealYearMonth;
    private final int receivedCount;
    private final int insertedCount;
    private final int updatedCount;
    private final int duplicateCount;
}
