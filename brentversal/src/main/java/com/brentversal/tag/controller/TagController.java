package com.brentversal.tag.controller;

import com.brentversal.tag.dto.TagResponseDto;
import com.brentversal.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/tag")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    // 태그 전체 목록 조회. 매물 등록/수정 폼에서 태그 선택 UI를 그릴 때 사용
    @GetMapping
    public List<TagResponseDto> list() {
        return tagService.findAll();
    }
}
