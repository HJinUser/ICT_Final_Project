package com.brentversal.neighborhood.service;

public class NeighborhoodNotFoundException extends RuntimeException {

    public NeighborhoodNotFoundException(Long id) {
        super("동네 정보를 찾을 수 없습니다. id=" + id);
    }
}
