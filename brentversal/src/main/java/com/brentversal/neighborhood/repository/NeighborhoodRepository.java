package com.brentversal.neighborhood.repository;

import com.brentversal.neighborhood.entity.Neighborhood;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Long> {

    @EntityGraph(attributePaths = "tags")
    List<Neighborhood> findAllByOrderByIdAsc();

    @EntityGraph(attributePaths = "tags")
    Optional<Neighborhood> findWithTagsById(Long id);

    // 매물을 등록/수정할 때 sigungu(구)·dong(동)으로 어느 동네에 속하는지 찾는다.
    // 아직 관리자가 등록하지 않은 동네면 못 찾을 수 있으므로 Optional.
    Optional<Neighborhood> findByDistrictAndDong(String district, String dong);

    boolean existsByCityAndDistrictAndDong(String city, String district, String dong);
}
