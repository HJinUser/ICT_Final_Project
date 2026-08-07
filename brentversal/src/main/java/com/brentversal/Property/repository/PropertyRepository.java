package com.brentversal.Property.repository;

import com.brentversal.Property.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByIdIn(List<Long> ids);

}
