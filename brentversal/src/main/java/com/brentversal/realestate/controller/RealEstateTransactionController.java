package com.brentversal.realestate.controller;

import com.brentversal.realestate.dto.RealEstateCollectResponse;
import com.brentversal.realestate.dto.RealEstateTransactionResponse;
import com.brentversal.realestate.service.RealEstateTransactionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/real-estate-transactions")
public class RealEstateTransactionController {

    private final RealEstateTransactionService transactionService;

    public RealEstateTransactionController(
            RealEstateTransactionService transactionService
    ) {
        this.transactionService = transactionService;
    }

    @PostMapping("/collect")
    public ResponseEntity<RealEstateCollectResponse> collect(
            @RequestParam(defaultValue = "11650") String regionCode,
            @RequestParam(required = false) String dealYearMonth
    ) {
        return ResponseEntity.ok(
                transactionService.collect(regionCode, dealYearMonth)
        );
    }

    @GetMapping
    public ResponseEntity<List<RealEstateTransactionResponse>> findAll(
            @RequestParam(defaultValue = "11650") String regionCode,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to
    ) {
        return ResponseEntity.ok(
                transactionService.findAll(regionCode, from, to)
        );
    }
}
