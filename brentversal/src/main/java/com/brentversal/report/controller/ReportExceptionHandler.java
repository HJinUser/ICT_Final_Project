package com.brentversal.report.controller;

import com.brentversal.report.service.ReportMemberNotFoundException;
import com.brentversal.report.service.ReportNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice(basePackageClasses = ReportController.class)
public class ReportExceptionHandler {

    @ExceptionHandler(ReportNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(
            ReportNotFoundException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(ReportMemberNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleMemberNotFound(
            ReportMemberNotFoundException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(
            IllegalArgumentException exception
    ) {
        return ResponseEntity
                .badRequest()
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(
            IllegalStateException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("message", exception.getMessage()));
    }
}
