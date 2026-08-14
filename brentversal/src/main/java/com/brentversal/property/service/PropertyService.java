package com.brentversal.property.service;

import com.brentversal.agency.service.MyAgencyService;
import com.brentversal.neighborhood.repository.NeighborhoodRepository;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PriceChangeStatus;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.constant.PropertyType;
import com.brentversal.property.dto.PropertyResponseDto;
import com.brentversal.property.dto.PropertySearchCondition;
import com.brentversal.property.dto.PropertySearchDto;
import com.brentversal.property.entity.Property;
import com.brentversal.property.repository.PropertyRepository;
import com.brentversal.agency.entity.Agency;
import com.brentversal.property_image.entity.PropertyImage;
import com.brentversal.property_image.service.PropertyImageService;
import com.brentversal.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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

    // 매물의 sigungu·dong으로 어느 동네(Neighborhood)에 속하는지 찾아 neighborhoodId를 채우는 데 쓴다.
    private final NeighborhoodRepository neighborhoodRepository;

    // 관리자가 아직 등록하지 않은 동네면 못 찾을 수 있다 — 그럴 땐 null로 두고, 나중에
    // 그 동네가 등록되면 다음 등록/수정 때 다시 연결되게 한다(과거 데이터를 소급 연결하진 않음).
    private Long resolveNeighborhoodId(String district, String dong) {
        if (district == null || dong == null) return null;
        return neighborhoodRepository.findByDistrictAndDong(district, dong)
                .map(neighborhood -> neighborhood.getId())
                .orElse(null);
    }

    // 방 개수 "3개 이상" 조건을 펼칠 때 쓰는 상한.
    // Property.roomCount 의 @Max(6) 과 같은 값이라, 그쪽이 바뀌면 여기도 함께 바꾼다.
    private static final int MAX_ROOM_COUNT = 6;

    // 매물 주소 -> 좌표(지오코딩)는 다른 팀원이 맡기로 해서 여기서는 하지 않는다.
    //
    // 좌표(property.latitude/longitude)가 비어 있으면 지도 검색에 핀이 찍히지 않는다.
    // 지금은 data.sql 의 예시 매물에만 좌표가 들어 있고, 새로 등록한 매물은 목록에만 보인다.
    // 등록·수정 시 좌표를 채우는 처리가 붙으면 지도에도 함께 나온다.
    // (common/geocoding/KakaoGeocodingService 를 그대로 쓰면 되고,
    //  중개사무소 쪽 예시는 MyAgencyService.updateCoordinates 를 참고하면 된다)

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

    public PropertyResponseDto update(Long id, Property changes, List<MultipartFile> newFiles, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        // 가격 변경 전, 거래유형과 대표 가격을 미리 기록해 둔다 (수정 후와 비교하기 위해)
        DealType oldDealType = property.getDealType();
        Long oldPrimaryPrice = getPrimaryPrice(property);

        property.setName(changes.getName());
        property.setType(changes.getType());
        property.setDealType(changes.getDealType());
        property.setAddress(changes.getAddress());
        property.setSigungu(changes.getSigungu());
        property.setDong(changes.getDong());
        property.setNeighborhoodId(resolveNeighborhoodId(changes.getSigungu(), changes.getDong()));
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
        property.setStatus(PropertyStatus.PENDING); // 수정하면 다시 관리자 승인을 받아야 한다

        // 거래유형이 그대로일 때만 가격 등락을 비교한다 (유형이 바뀌면 가격 성격이 달라서 비교 자체가 의미 없음)
        if (oldDealType == property.getDealType()) {
            Long newPrimaryPrice = getPrimaryPrice(property);
            if (oldPrimaryPrice != null && newPrimaryPrice != null && !oldPrimaryPrice.equals(newPrimaryPrice)) {
                property.setPriceStatus(newPrimaryPrice > oldPrimaryPrice ? PriceChangeStatus.UP : PriceChangeStatus.DOWN);
            }
        }

        // ── 사진 갱신: keepImageIds에 없는 기존 사진은 저장소에서 지우고, 새로 올라온 파일을 추가한다 ──
        List<Long> keepIds = changes.getKeepImageIds() != null ? changes.getKeepImageIds() : List.of();

        List<PropertyImage> remaining = new ArrayList<>();
        for (PropertyImage image : property.getImages()) {
            if (keepIds.contains(image.getId())) {
                remaining.add(image);
            } else {
                propertyImageService.deleteFile(image.getUrl()); // 저장소 파일만 지움. DB 행 삭제는 아래 orphanRemoval이 처리
            }
        }

        int newFileCount = (newFiles == null) ? 0
                : (int) newFiles.stream().filter(f -> f != null && !f.isEmpty()).count();
        if (remaining.size() + newFileCount > PropertyImageService.MAX_IMAGE_COUNT) {
            throw new IllegalArgumentException("사진은 최대 " + PropertyImageService.MAX_IMAGE_COUNT + "장까지 등록할 수 있습니다.");
        }

        remaining.addAll(propertyImageService.buildImages(property, newFiles));

        // sortOrder를 다시 매기고, 첫 장을 대표 사진으로 지정
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setSortOrder(i);
            remaining.get(i).setIsMain(i == 0);
        }

        property.getImages().clear();
        property.getImages().addAll(remaining);

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
        bean.setNeighborhoodId(resolveNeighborhoodId(bean.getSigungu(), bean.getDong()));

        bean.setStatus(PropertyStatus.PENDING);
        bean.setVisible(true);
        bean.setCreatedAt(LocalDateTime.now());

        bean.getImages().addAll(propertyImageService.buildImages(bean, files));
        bean.setTags(tagService.findByIds(bean.getTagIds()));

        return PropertyResponseDto.of(propertyRepository.save(bean));
    }

    // 로그인한 중개인이 등록한 매물 전체 조회 ("내 매물" 화면용)
    public List<PropertyResponseDto> findMine(String email) {
        Agency agency = myAgencyService.findMyAgency(email);

        return propertyRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId(), Pageable.unpaged())
                .stream()
                .map(PropertyResponseDto::of)
                .toList();
    }

    // 지도 검색. 왼쪽 필터 조건으로 매물을 찾아 지도 핀과 오른쪽 목록에 함께 쓴다.
    //
    // 사용자에게 노출되는 매물만 보여 준다(게시중 + 공개). 승인 대기나 비공개 매물은 나오지 않는다.
    // email 은 "내 매물만 보기"를 눌렀을 때만 쓰이고, 비회원 검색에서는 null 이다.
    @Transactional(readOnly = true)
    public List<PropertySearchDto> search(PropertySearchCondition condition, String email) {
        Long agencyId = null;

        // 중개인이 "내 매물"을 골랐으면 그 사람의 사무소로 범위를 좁힌다.
        // 사무소가 없으면 보여 줄 내 매물도 없으므로 빈 목록을 돌려준다.
        if (condition.isMine()) {
            if (email == null) return List.of();

            try {
                agencyId = myAgencyService.findMyAgency(email).getId();
            } catch (IllegalArgumentException e) {
                return List.of();
            }
        }

        // 태그를 고르지 않았으면 조건에서 빼야 하는데, JPQL 의 in 절에는 빈 목록을 넣을 수 없다.
        // 그래서 개수(tagCount)가 0이면 조건 자체를 건너뛰도록 하고, 목록에는 값 하나를 넣어 둔다.
        List<Long> tagIds = (condition.getTagIds() == null || condition.getTagIds().isEmpty())
                ? List.of(0L)
                : condition.getTagIds();
        long tagCount = (condition.getTagIds() == null) ? 0 : condition.getTagIds().size();

        List<Property> found = propertyRepository.search(
                PropertyStatus.ACTIVE,
                blankToNull(condition.getKeyword()),
                blankToNull(condition.getRegion()),
                blankToNull(condition.getDong()),
                toType(condition.getType()),
                toDealType(condition.getDealType()),
                agencyId,
                condition.getMinPrice(),
                condition.getMaxPrice(),
                condition.getMinArea(),
                condition.getMaxArea(),
                expandRoomCounts(condition.getRoomCounts()),
                tagIds,
                tagCount);

        return found.stream()
                .map(PropertySearchDto::of)
                .sorted(comparatorOf(condition.getSort()))
                .toList();
    }

    // 정렬은 DB 대신 여기서 한다.
    // 대표 금액이 거래 유형마다 다른 칸에 들어 있어(매매/전세/월세) DTO 로 바꾼 뒤 비교하는 편이 단순하다.
    // 값이 비어 있는 매물이 섞여도 오류가 나지 않게 null 은 항상 뒤로 보낸다.
    private Comparator<PropertySearchDto> comparatorOf(String sort) {
        String key = (sort == null || sort.isBlank()) ? "LATEST" : sort.toUpperCase();

        return switch (key) {
            case "PRICE_ASC" -> Comparator.comparing(PropertySearchDto::getPrice,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "PRICE_DESC" -> Comparator.comparing(PropertySearchDto::getPrice,
                    Comparator.nullsLast(Comparator.reverseOrder()));
            case "AREA_DESC" -> Comparator.comparing(PropertySearchDto::getArea,
                    Comparator.nullsLast(Comparator.reverseOrder()));
            case "AREA_ASC" -> Comparator.comparing(PropertySearchDto::getArea,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            // 최신 등록순. 리포지토리가 이미 그 순서로 가져오므로 순서를 그대로 둔다.
            default -> Comparator.comparing(PropertySearchDto::getId, Comparator.reverseOrder());
        };
    }

    // 빈 문자열로 들어온 조건은 "고르지 않음"으로 본다
    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    // 방 개수 조건을 실제로 비교할 값 목록으로 펼친다.
    //
    // 화면의 버튼은 [1개(원룸)] [2개] [3개 이상] 세 가지이고 복수 선택이 된다.
    // "3개 이상"은 3 으로 넘어오므로, 여기서 매물이 가질 수 있는 최대치까지 늘려 준다.
    // (Property.roomCount 는 최대 6까지 허용된다)
    private List<Integer> expandRoomCounts(List<Integer> roomCounts) {
        if (roomCounts == null || roomCounts.isEmpty()) return null; // 조건 없음

        List<Integer> expanded = new ArrayList<>();

        for (Integer count : roomCounts) {
            if (count == null) continue;

            if (count >= 3) {
                for (int i = count; i <= MAX_ROOM_COUNT; i++) expanded.add(i);
            } else {
                expanded.add(count);
            }
        }

        return expanded.isEmpty() ? null : expanded;
    }

    // 매물 유형 문자열을 열거형으로 바꾼다. 안 골랐거나 잘못된 값이면 조건에서 제외한다.
    private PropertyType toType(String type) {
        if (type == null || type.isBlank() || "ALL".equalsIgnoreCase(type)) return null;

        try {
            return PropertyType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    // 거래 유형 문자열을 열거형으로 바꾼다. 안 골랐거나 잘못된 값이면 조건에서 제외한다.
    private DealType toDealType(String dealType) {
        if (dealType == null || dealType.isBlank() || "ALL".equalsIgnoreCase(dealType)) return null;

        try {
            return DealType.valueOf(dealType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}