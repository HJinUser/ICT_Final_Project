package com.brentversal.realestate.repository;

import com.brentversal.realestate.entity.RealEstateTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RealEstateTransactionRepository
        extends JpaRepository<RealEstateTransaction, Long> {

    Optional<RealEstateTransaction> findBySourceNameAndSourceItemId(
            String sourceName,
            String sourceItemId
    );

    List<RealEstateTransaction> findByRegionCodeAndDealDateBetweenOrderByDealDateDesc(
            String regionCode,
            LocalDate from,
            LocalDate to
    );
}
