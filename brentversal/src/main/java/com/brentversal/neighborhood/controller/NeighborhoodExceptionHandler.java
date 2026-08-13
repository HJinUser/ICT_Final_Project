package com.brentversal.neighborhood.controller;

import com.brentversal.neighborhood.service.NeighborhoodNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;

@RestControllerAdvice(basePackageClasses = NeighborhoodController.class)
public class NeighborhoodExceptionHandler {

    @ExceptionHandler(NeighborhoodNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NeighborhoodNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, String>> handleBadRequest(Exception exception) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "동네 검색 조건이 올바르지 않습니다."));
    }
}
