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
}
