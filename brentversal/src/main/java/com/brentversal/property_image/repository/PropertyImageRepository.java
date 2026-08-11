package com.brentversal.property_image.repository;

import com.brentversal.property.entity.Property;
import com.brentversal.property_image.entity.PropertyImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyImageRepository extends JpaRepository<PropertyImage, Long> {
}
