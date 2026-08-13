package com.brentversal.realestate.service;

import com.brentversal.realestate.client.MolitApartmentTradeClient;
import com.brentversal.realestate.dto.MolitApartmentTradeItem;
import com.brentversal.realestate.dto.RealEstateCollectResponse;
import com.brentversal.realestate.dto.RealEstateTransactionResponse;
import com.brentversal.realestate.entity.RealEstateTransaction;
import com.brentversal.realestate.repository.RealEstateTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class RealEstateTransactionService {

    private static final String REGION_CODE_PATTERN = "\\d{5}";
    private static final String YEAR_MONTH_PATTERN = "\\d{6}";

    private final MolitApartmentTradeClient molitClient;
    private final RealEstateTransactionRepository transactionRepository;

    public RealEstateTransactionService(
            MolitApartmentTradeClient molitClient,
            RealEstateTransactionRepository transactionRepository
    ) {
        this.molitClient = molitClient;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public RealEstateCollectResponse collect(
            String regionCode,
            String requestedDealYearMonth
    ) {
        String normalizedRegionCode = validateRegionCode(regionCode);
        String dealYearMonth = normalizeDealYearMonth(requestedDealYearMonth);

        if (!molitClient.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "MOLIT_API_KEY가 설정되지 않았습니다."
            );
        }

        List<MolitApartmentTradeItem> items;
        try {
            items = molitClient.fetch(normalizedRegionCode, dealYearMonth);
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    exception.getMessage(),
                    exception
            );
        }

        int insertedCount = 0;
        int updatedCount = 0;
        int duplicateCount = 0;
        LocalDateTime collectedAt = LocalDateTime.now();

        for (MolitApartmentTradeItem item : items) {
            RealEstateTransaction saved = transactionRepository
                    .findBySourceNameAndSourceItemId(
                            MolitApartmentTradeClient.SOURCE_NAME,
                            item.getSourceItemId()
                    )
                    .orElse(null);

            if (saved == null) {
                transactionRepository.save(
                        RealEstateTransaction.create(
                                item,
                                MolitApartmentTradeClient.SOURCE_NAME,
                                MolitApartmentTradeClient.SOURCE_URL,
                                collectedAt
                        )
                );
                insertedCount++;
                continue;
            }

            if (saved.updateFrom(item, collectedAt)) {
                transactionRepository.save(saved);
                updatedCount++;
            } else {
                duplicateCount++;
            }
        }

        return new RealEstateCollectResponse(
                normalizedRegionCode,
                dealYearMonth,
                items.size(),
                insertedCount,
                updatedCount,
                duplicateCount
        );
    }

    @Transactional(readOnly = true)
    public List<RealEstateTransactionResponse> findAll(
            String regionCode,
            LocalDate from,
            LocalDate to
    ) {
        String normalizedRegionCode = validateRegionCode(regionCode);
        LocalDate normalizedTo = to == null ? LocalDate.now() : to;
        LocalDate normalizedFrom = from == null
                ? normalizedTo.minusMonths(6)
                : from;

        if (normalizedFrom.isAfter(normalizedTo)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "조회 시작일은 종료일보다 늦을 수 없습니다."
            );
        }

        return transactionRepository
                .findByRegionCodeAndDealDateBetweenOrderByDealDateDesc(
                        normalizedRegionCode,
                        normalizedFrom,
                        normalizedTo
                )
                .stream()
                .map(RealEstateTransactionResponse::from)
                .toList();
    }

    private String validateRegionCode(String regionCode) {
        String normalized = regionCode == null ? "" : regionCode.trim();

        if (!normalized.matches(REGION_CODE_PATTERN)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "regionCode는 법정동 코드 앞 5자리여야 합니다."
            );
        }

        return normalized;
    }

    private String normalizeDealYearMonth(String requestedDealYearMonth) {
        String normalized = requestedDealYearMonth == null
                || requestedDealYearMonth.isBlank()
                ? YearMonth.now().minusMonths(1).toString().replace("-", "")
                : requestedDealYearMonth.trim();

        if (!normalized.matches(YEAR_MONTH_PATTERN)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "dealYearMonth는 yyyyMM 형식이어야 합니다."
            );
        }

        try {
            YearMonth.of(
                    Integer.parseInt(normalized.substring(0, 4)),
                    Integer.parseInt(normalized.substring(4, 6))
            );
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "유효하지 않은 dealYearMonth입니다."
            );
        }

        return normalized;
    }
}
