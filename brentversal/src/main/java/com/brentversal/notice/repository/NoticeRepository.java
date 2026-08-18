package com.brentversal.notice.repository;

import com.brentversal.notice.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    List<Notice> findAllByOrderByCreatedAtDesc();

    Page<Notice> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query(
            value = """
                    SELECT * FROM notices
                    WHERE title LIKE CONCAT('%', :keyword, '%')
                       OR content LIKE CONCAT('%', :keyword, '%')
                    ORDER BY created_at DESC
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM notices
                    WHERE title LIKE CONCAT('%', :keyword, '%')
                       OR content LIKE CONCAT('%', :keyword, '%')
                    """,
            nativeQuery = true
    )
    Page<Notice> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}

