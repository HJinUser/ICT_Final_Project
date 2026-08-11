package com.brentversal.favorite.service;

import com.brentversal.favorite.entity.Favorite;
import com.brentversal.favorite.repository.FavoriteRepository;
import com.brentversal.member.entity.Member;
import com.brentversal.member.repository.MemberRepository;
import com.brentversal.property.dto.PropertyResponseDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final MemberRepository memberRepository;
    private final PropertyRepository propertyRepository;

    // 관심매물 토글: 이미 찜해놨으면 취소하고, 안 해놨으면 새로 찜한다.
    // 반환값은 토글 후 상태(true=지금 찜한 상태, false=취소된 상태) — 프론트가 하트 아이콘을 그 값 그대로 반영하면 된다.
    @Transactional
    public boolean toggle(String email, Long propertyId) {
        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("해당 매물을 찾을 수 없습니다. id=" + propertyId));

        Optional<Favorite> existing = favoriteRepository.findByMemberAndProperty(member, property);

        if (existing.isPresent()) {
            favoriteRepository.delete(existing.get());
            return false;
        }

        Favorite favorite = new Favorite();
        favorite.setMember(member);
        favorite.setProperty(property);
        favorite.setCreatedAt(LocalDateTime.now());
        favoriteRepository.save(favorite);
        return true;
    }

    // 로그인한 회원이 찜한 매물 전체 목록 (PropertyResponseDto로 변환해서 돌려줌 — compare API와 같은 변환 방식)
    public List<PropertyResponseDto> findFavoriteProperties(String email) {
        Member member = memberRepository.findByEmail(email);
        if (member == null) {
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }

        return favoriteRepository.findByMember(member).stream()
                .map(favorite -> PropertyResponseDto.of(favorite.getProperty()))
                .toList();
    }
}