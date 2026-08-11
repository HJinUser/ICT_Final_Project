package com.brentversal.tag.service;

import com.brentversal.tag.dto.TagResponseDto;
import com.brentversal.tag.entity.Tag;
import com.brentversal.tag.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagService {
    private final TagRepository tagRepository;

    // id 목록으로 태그 엔티티들을 조회. 다른 도메인(매물, 회원 등)이 태그를 연결할 때 사용.
    public List<Tag> findByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return tagRepository.findAllById(ids);
    }

    // 태그 전체 목록. 매물 등록/수정 폼의 태그 선택 UI에서 사용
    public List<TagResponseDto> findAll() {
        return tagRepository.findAll().stream()
                .map(TagResponseDto::of)
                .toList();
    }
}