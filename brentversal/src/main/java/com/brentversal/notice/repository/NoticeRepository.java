package com.brentversal.notice.repository;
import com.brentversal.notice.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository
        extends JpaRepository<Notice, Long> {
}





