package com.brentversal.property.service;

import com.brentversal.agency.service.MyAgencyService;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PriceChangeStatus;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.dto.PropertyResponseDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.property_image.service.PropertyImageService;
import com.brentversal.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;

    private final PropertyImageService propertyImageService;

    private final TagService tagService;

    // 로그인한 사람의 중개사무소를 찾을 때 쓴다.
    // 매물의 주인을 정하거나, 내 매물이 맞는지 확인하는 데 필요하다.
    private final MyAgencyService myAgencyService;

    private Property findPropertyOrThrow(Long id) {
        return propertyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 매물을 찾을 수 없습니다. id=" + id));
    }

    // 매물을 찾으면서 "로그인한 중개인의 매물이 맞는지"까지 확인한다.
    //
    // 매물 id 는 주소에 그대로 드러나기 때문에, 검사를 하지 않으면 숫자만 바꿔서
    // 남의 매물을 수정하거나 거래완료/비공개로 만들 수 있다.
    // 수정·상태변경·취소·공개전환에서 똑같이 필요한 검사라 따로 뺐다.
    private Property findMyPropertyOrThrow(Long id, String email) {
        Property property = findPropertyOrThrow(id);
        Long myAgencyId = myAgencyService.findMyAgency(email).getId();

        // agency 는 지연 로딩 프록시지만, id 만 꺼내는 것은 실제 조회 없이 가능하다
        if (property.getAgency() == null || !property.getAgency().getId().equals(myAgencyId)) {
            throw new IllegalArgumentException("내 중개사무소의 매물이 아닙니다.");
        }

        return property;
    }

    // 거래유형에 따라 실제 비교 대상이 되는 가격 하나를 뽑아준다 (매매=price, 전세=deposit, 월세=monthlyDeposit)
    private Long getPrimaryPrice(Property property) {
        return switch (property.getDealType()) {
            case SALE -> property.getPrice();
            case JEONSE -> property.getDeposit();
            case MONTHLY -> property.getMonthlyDeposit();
        };
    }

    // 거래유형(dealType)에 맞는 가격 필드가 채워져 있는지 확인.
    // 문제가 있으면 "필드명 → 에러메시지"를 담아 반환하고, 문제 없으면 빈 Map을 반환함.
    public Map<String, String> validatePricingFields(Property property) {
        Map<String, String> errors = new HashMap<>();

        switch (property.getDealType()) {
            case SALE -> {
                if (property.getPrice() == null) {
                    errors.put("price", "매매 거래는 매매가를 입력해야 합니다.");
                }
            }
            case JEONSE -> {
                if (property.getDeposit() == null) {
                    errors.put("deposit", "전세 거래는 전세가를 입력해야 합니다.");
                }
            }
            case MONTHLY -> {
                if (property.getMonthlyDeposit() == null) {
                    errors.put("monthlyDeposit", "월세 거래는 월세 보증금을 입력해야 합니다.");
                }
                if (property.getMonthlyRent() == null) {
                    errors.put("monthlyRent", "월세 거래는 월세 금액을 입력해야 합니다.");
                }
            }
        }
        return errors;
    }

    public Optional<PropertyResponseDto> findById(Long id) {
        return propertyRepository.findById(id)
                .map(PropertyResponseDto::of);
    }

    public List<PropertyResponseDto> findByIds(List<Long> ids) {
        return propertyRepository.findByIdIn(ids).stream()
                .map(PropertyResponseDto::of)
                .toList();
    }

    public PropertyResponseDto update(Long id, Property changes, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        // 가격 변경 전, 거래유형과 대표 가격을 미리 기록해 둔다 (수정 후와 비교하기 위해)
        DealType oldDealType = property.getDealType();
        Long oldPrimaryPrice = getPrimaryPrice(property);

        property.setName(changes.getName());
        property.setType(changes.getType());
        property.setDealType(changes.getDealType());
        property.setAddress(changes.getAddress());
        property.setArea(changes.getArea());
        property.setFloor(changes.getFloor());
        property.setRoomCount(changes.getRoomCount());
        property.setBathroomCount(changes.getBathroomCount());
        property.setPrice(changes.getPrice());
        property.setDeposit(changes.getDeposit());
        property.setMonthlyDeposit(changes.getMonthlyDeposit());
        property.setMonthlyRent(changes.getMonthlyRent());
        property.setMaintenanceFee(changes.getMaintenanceFee());
        property.setDescription(changes.getDescription());
        property.setDetailDescription(changes.getDetailDescription());
        property.setMoveInDate(changes.getMoveInDate());
        property.setContractStatus(changes.getContractStatus());
        property.setTags(tagService.findByIds(changes.getTagIds()));

        // 거래유형이 그대로일 때만 가격 등락을 비교한다 (유형이 바뀌면 가격 성격이 달라서 비교 자체가 의미 없음)
        if (oldDealType == property.getDealType()) {
            Long newPrimaryPrice = getPrimaryPrice(property);
            if (oldPrimaryPrice != null && newPrimaryPrice != null && !oldPrimaryPrice.equals(newPrimaryPrice)) {
                property.setPriceStatus(newPrimaryPrice > oldPrimaryPrice ? PriceChangeStatus.UP : PriceChangeStatus.DOWN);
            }
        }

        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    // 거래 상태 변경 (게시중/거래진행중/거래완료). 거래완료·등록취소는 되돌릴 수 없음
    public PropertyResponseDto updateStatus(Long id, PropertyStatus newStatus, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        if (property.getStatus() == PropertyStatus.COMPLETED || property.getStatus() == PropertyStatus.CANCELLED) {
            throw new IllegalStateException("거래완료 또는 등록취소된 매물은 상태를 변경할 수 없습니다.");
        }

        property.setStatus(newStatus);
        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    // 등록 취소. 되돌릴 수 없어서, 이미 취소된 매물이면 그냥 그대로 반환(중복 처리 방지)
    public PropertyResponseDto cancel(Long id, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        if (property.getStatus() == PropertyStatus.CANCELLED) {
            return PropertyResponseDto.of(property);
        }

        property.setStatus(PropertyStatus.CANCELLED);
        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    public PropertyResponseDto toggleVisibility(Long id, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        property.setVisible(!property.getVisible());
        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    public PropertyResponseDto insert(Property bean, List<MultipartFile> files, String email) {
        // 매물이 어느 사무소 것인지는 로그인한 사람을 보고 서버가 정한다.
        // 요청 본문의 agency 값은 신뢰하지 않고 덮어쓴다 — 그대로 두면 남의 사무소 번호를
        // 넣어 그 사무소 명의로 매물을 등록할 수 있기 때문이다.
        bean.setAgency(myAgencyService.findMyAgency(email));

        bean.setStatus(PropertyStatus.PENDING);
        bean.setVisible(true);
        bean.setCreatedAt(LocalDateTime.now());

        bean.getImages().addAll(propertyImageService.buildImages(bean, files));
        bean.setTags(tagService.findByIds(bean.getTagIds()));

        return PropertyResponseDto.of(propertyRepository.save(bean));
    }
}