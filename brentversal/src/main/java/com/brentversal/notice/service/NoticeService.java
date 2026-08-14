package com.brentversal.notice.service;

import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.notice.dto.NoticeCreateRequest;
import com.brentversal.notice.dto.NoticeResponse;
import com.brentversal.notice.dto.NoticeUpdateRequest;
import com.brentversal.notice.entity.Notice;
import com.brentversal.notice.exception.NoticeNotFoundException;
import com.brentversal.notice.repository.NoticeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class NoticeService {

    private static final int PAGE_SIZE = 10;

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;

    public NoticeService(
            NoticeRepository noticeRepository,
            MemberRepository memberRepository
    ) {
        this.noticeRepository = noticeRepository;
        this.memberRepository = memberRepository;
    }

    public List<NoticeResponse> findAll() {
        return noticeRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(NoticeResponse::from)
                .toList();
    }

    public Page<NoticeResponse> findAll(int page, String keyword) {
        Pageable pageable = PageRequest.of(Math.max(0, page), PAGE_SIZE);

        if (keyword == null || keyword.isBlank()) {
            return noticeRepository.findAllByOrderByCreatedAtDesc(pageable)
                    .map(NoticeResponse::from);
        }

        return noticeRepository.searchByKeyword(keyword.trim(), pageable)
                .map(NoticeResponse::from);
    }

    @Transactional
    public NoticeResponse findById(Long id) {
        Notice notice = getNotice(id);
        notice.increaseViewCount();
        return NoticeResponse.from(notice);
    }

    @Transactional
    public NoticeResponse create(
            NoticeCreateRequest request,
            String adminEmail
    ) {
        Member admin = memberRepository.findByEmail(adminEmail);
        if (admin == null) {
            throw new IllegalArgumentException("공지사항 작성자를 찾을 수 없습니다.");
        }

        Notice notice = Notice.create(
                admin,
                request.getTitle(),
                request.getContent()
        );

        return NoticeResponse.from(noticeRepository.save(notice));
    }

    @Transactional
    public NoticeResponse update(
            Long id,
            NoticeUpdateRequest request
    ) {
        Notice notice = getNotice(id);
        notice.update(request.getTitle(), request.getContent());
        return NoticeResponse.from(notice);
    }

    @Transactional
    public void delete(Long id) {
        Notice notice = getNotice(id);
        noticeRepository.delete(notice);
    }

    public long count() {
        return noticeRepository.count();
    }

    private Notice getNotice(Long id) {
        return noticeRepository.findById(id)
                .orElseThrow(() -> new NoticeNotFoundException(id));
    }
}
