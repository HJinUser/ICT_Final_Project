package com.brentversal.notice.service;
import com.brentversal.notice.repository.NoticeRepository;
import com.brentversal.notice.Notice;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
    public class NoticeService {
        private final NoticeRepository noticeRepository;

    // 공지사항 전체 조회
    public List<Notice>findAll() {
        return noticeRepository.findAll();
    }

    // 공지사항 단건 조회
    public Notice findById(Long id) {
        return noticeRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "공지사항을 찾을 수 없습니다."
                        )
                );
    }
    // 공지사항 등록
    @Transactional
    public Notice create(Notice notice) {
        return noticeRepository.save(notice);
    }

    // 공지사항 수정
    @Transactional
    public Notice update(
            Long id,
            String title,
            String content
    ) {
        Notice notice = findById(id);

        notice.update(
                title,
                content,
                null,
                null,
                null
        );

        return notice;
    }
    // 공지사항 삭제
    @Transactional
    public void delete(Long id) {
        Notice notice = findById(id);
        noticeRepository.delete(notice);
    }
    // 공지사항 전체 개수 조회
    public long count() {
        return noticeRepository.count();
    }
}