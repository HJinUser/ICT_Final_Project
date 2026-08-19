package com.brentversal.property.service;

import com.brentversal.agency.service.MyAgencyService;
import com.brentversal.common.geocoding.KakaoGeocodingService;
import com.brentversal.common.ml.MlClient;
import com.brentversal.common.ml.MlPriceRequest;
import com.brentversal.common.ml.MlPriceResponse;
import com.brentversal.neighborhood.repository.NeighborhoodRepository;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PriceChangeStatus;
import com.brentversal.property.constant.PropertyStatus;
import com.brentversal.property.constant.PropertyType;
import com.brentversal.property.dto.AiPricePreviewResponseDto;
import com.brentversal.property.dto.PropertyDraftSummaryDto;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Pageable;

// 이 클래스에서 사용할 Java/Spring/프로젝트 타입 불러옴
import com.brentversal.property.validation.PropertyFinalValidation;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import java.util.Set;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

    // 주소 -> 좌표 변환. Agency 도메인과 같은 서비스를 그대로 재사용한다.
    private final KakaoGeocodingService kakaoGeocodingService;

    // 주소 좌표변환 서비스와 FastAPI 호출 Client를 PropertyService에 주입함
    private final MlClient mlClient;

    // 최종 제출용 Validation Group을 Service에서 실행하기 위해 Validator 주입함
    private final Validator validator;

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

    private void updateCoordinates(Property property, String previousAddress){
        String address = property.getAddress();
        boolean addressChanged = address != null && !address.equals(previousAddress);
        boolean coordinatesMissing = property.getLatitude() == null || property.getLongitude() == null;
        if (!addressChanged && !coordinatesMissing) return;

        kakaoGeocodingService.findCoordinates(address).ifPresent(coordinates -> {
            property.setLatitude(coordinates.latitude());
            property.setLongitude(coordinates.longitude());
        });
    }

    private void normalizePriceFields(Property property){
        switch (property.getDealType()) {
            case SALE -> {
                property.setDeposit(null);
                property.setMonthlyDeposit(null);
                property.setMonthlyRent(null);
            }
            case JEONSE -> {
                property.setPrice(null);
                property.setMonthlyDeposit(null);
                property.setMonthlyRent(null);
            }
            case MONTHLY -> {
                property.setPrice(null);
                property.setDeposit(null);
            }
        }
    }

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

    // 현재 로그인한 중개인의 DRAFT인지 확인한 뒤 해당 매물을 반환하는 메서드임
    private Property findMyDraftOrThrow(Long draftId, String email) {
        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        Property draft = propertyRepository.findById(draftId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "임시 저장된 매물을 찾을 수 없습니다."));

        Long myAgencyId = myAgencyService.findMyAgency(email).getId();

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (draft.getAgency() == null
                || !draft.getAgency().getId().equals(myAgencyId)) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("내 중개사무소의 임시저장 매물이 아닙니다.");
        }

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (draft.getStatus() != PropertyStatus.DRAFT) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException("이미 임시저장 상태가 아닌 매물입니다.");
        }

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return draft;
    }

    // 일반 신규등록용 visible=true DRAFT인지 추가로 확인하는 메서드임
    private Property findMyUserDraftOrThrow(Long draftId, String email) {
        Property draft = findMyDraftOrThrow(draftId, email);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (!Boolean.TRUE.equals(draft.getVisible())) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    "신규 등록용 임시저장 매물이 아닙니다.");
        }

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return draft;
    }

    // 폼에서 받은 수정 가능한 매물 입력값만 대상 Entity에 복사하는 메서드임
    private void copyFormFields(Property target, Property source) {
        target.setName(source.getName());
        target.setDescription(source.getDescription());
        target.setType(source.getType());
        target.setDealType(source.getDealType());
        target.setAddress(source.getAddress());
        target.setSigungu(source.getSigungu());
        target.setDong(source.getDong());
        target.setNeighborhoodId(
                resolveNeighborhoodId(source.getSigungu(), source.getDong()));
        target.setArea(source.getArea());
        target.setFloor(source.getFloor());
        target.setBuildYear(source.getBuildYear());
        target.setRoomCount(source.getRoomCount());
        target.setBathroomCount(source.getBathroomCount());
        target.setPrice(source.getPrice());
        target.setDeposit(source.getDeposit());
        target.setMonthlyDeposit(source.getMonthlyDeposit());
        target.setMonthlyRent(source.getMonthlyRent());
        target.setMaintenanceFee(source.getMaintenanceFee());
        target.setDetailDescription(source.getDetailDescription());
        target.setMoveInDate(source.getMoveInDate());
        target.setContractStatus(source.getContractStatus());
        // Hibernate가 관리하는 기존 태그 컬렉션은 유지하고 내용만 교체함
        target.getTags().clear();
        target.getTags().addAll(tagService.findByIds(source.getTagIds()));
    }

    // 주소 비교 전에 앞뒤 공백과 연속 공백을 정리하는 메서드임
    private String normalizeAddress(String address) {
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return address == null ? "" : address.trim().replaceAll("\\s+", " ");
    }

    // BigDecimal 면적을 scale 차이와 무관하게 실제 숫자값 기준으로 비교하는 메서드임
    private boolean sameArea(BigDecimal a, BigDecimal b) {
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (a == null || b == null) {
            // 처리 완료된 결과를 호출한 쪽으로 반환함
            return a == b;
        }
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return a.compareTo(b) == 0;
    }

    // AI 예측에 영향을 주는 핵심 입력값이 이전 예측 때와 같은지 확인하는 메서드임
    private boolean samePredictionInputs(Property a, Property b) {
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return a.getType() == b.getType()
                && a.getDealType() == b.getDealType()
                && normalizeAddress(a.getAddress())
                .equals(normalizeAddress(b.getAddress()))
                && Objects.equals(a.getSigungu(), b.getSigungu())
                && sameArea(a.getArea(), b.getArea())
                && Objects.equals(a.getFloor(), b.getFloor())
                && Objects.equals(a.getBuildYear(), b.getBuildYear());
    }

    // AI 입력값이 바뀌었을 때 기존 좌표와 예측 결과를 모두 무효화하는 메서드임
    private void clearAiPrediction(Property property) {
        property.setLatitude(null);
        property.setLongitude(null);
        property.setStationDistance(null);
        property.setAiPrice(null);
        property.setAiDeposit(null);
        property.setAiMonthlyDeposit(null);
        property.setAiMonthlyRent(null);
    }

    // 거래유형에 필요한 AI 예측값이 실제로 저장되어 있는지 검증하는 메서드임
    private void ensureAiPredictionExists(Property property) {
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getDealType() == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException("거래 유형을 입력해 주세요.");
        }

        switch (property.getDealType()) {
            case SALE -> {
                // 현재 값/권한/상태가 조건을 만족하는지 확인함
                if (property.getAiPrice() == null) {
                    // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
                    throw new IllegalStateException("AI 예상 매매가가 없습니다. AI 시세 예측을 실행해 주세요.");
                }
            }
            case JEONSE -> {
                // 현재 값/권한/상태가 조건을 만족하는지 확인함
                if (property.getAiDeposit() == null) {
                    // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
                    throw new IllegalStateException("AI 예상 전세가가 없습니다. AI 시세 예측을 실행해 주세요.");
                }
            }
            case MONTHLY -> {
                // 현재 값/권한/상태가 조건을 만족하는지 확인함
                if (property.getAiMonthlyDeposit() == null
                        || property.getAiMonthlyRent() == null) {
                    // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
                    throw new IllegalStateException("AI 예상 월세 결과가 없습니다. AI 시세 예측을 실행해 주세요.");
                }
            }
        }
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

    // 매물 ID로 단건 조회하되 DRAFT는 공개 상세에서 제외하고 DTO로 반환하는 Service 메서드임
    public Optional<PropertyResponseDto> findById(Long id) {
        // ID로 Property를 조회하고 DRAFT가 아닌 매물만 응답 DTO로 변환해 반환함
        return propertyRepository.findById(id)
                .filter(property -> property.getStatus() != PropertyStatus.DRAFT)
                .map(PropertyResponseDto::of);
    }

    // 여러 매물 ID를 조회하되 DRAFT를 제외하고 DTO 목록으로 반환하는 Service 메서드임
    public List<PropertyResponseDto> findByIds(List<Long> ids) {
        // 요청한 ID 목록의 Property를 조회하고 DRAFT를 제외한 응답 DTO 목록으로 반환함
        return propertyRepository.findByIdIn(ids).stream()
                .filter(property -> property.getStatus() != PropertyStatus.DRAFT)
                .map(PropertyResponseDto::of)
                .toList();
    }

    public List<PropertyResponseDto> compareProperties(List<Long> ids) {
        if (ids == null || ids.size() != 2) {
            throw new IllegalArgumentException("비교할 매물은 정확히 2개여야 합니다.");
        }

        if (ids.get(0).equals(ids.get(1))) {
            throw new IllegalArgumentException("서로 다른 두 매물을 선택해야 합니다.");
        }

        List<Property> properties = propertyRepository.findByIdIn(ids);

        if (properties.size() != 2) {
            throw new IllegalArgumentException("선택한 매물 중 조회할 수 없는 매물이 있습니다.");
        }

        // findByIdIn()의 반환 순서는 요청한 ids 순서를 보장하지 않을 수 있으므로
        // 사용자가 선택한 순서대로 다시 찾는다.
        Property first = properties.stream()
                .filter(property -> property.getId().equals(ids.get(0)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("첫 번째 매물을 찾을 수 없습니다."));

        Property second = properties.stream()
                .filter(property -> property.getId().equals(ids.get(1)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("두 번째 매물을 찾을 수 없습니다."));

        if (first.getDealType() != second.getDealType()) {
            throw new IllegalArgumentException("같은 거래유형의 매물끼리만 비교할 수 있습니다.");
        }

        return List.of(
                PropertyResponseDto.of(first),
                PropertyResponseDto.of(second)
        );
    }

    // shadow DRAFT의 AI 입력·예측결과를 검증한 뒤 원본 매물을 수정하고 PENDING으로 전환하는 Service 메서드임
    public PropertyResponseDto update(
            Long id,
            Long aiDraftId,
            Property changes,
            List<MultipartFile> newFiles,
            String email) {

        Property property = findMyPropertyOrThrow(id, email);
        Property aiDraft = findMyDraftOrThrow(aiDraftId, email);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (Boolean.TRUE.equals(aiDraft.getVisible())) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    "신규 등록 임시저장 매물을 수정용 AI DRAFT로 사용할 수 없습니다.");
        }

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (!samePredictionInputs(aiDraft, changes)) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException(
                    "AI 시세 예측 후 입력 정보가 변경되었습니다. 다시 예측해 주세요.");
        }

        ensureAiPredictionExists(aiDraft);
        validateFinalProperty(changes);

        // 가격 변경 전, 거래유형과 대표 가격을 미리 기록해 둔다 (수정 후와 비교하기 위해)
        DealType oldDealType = property.getDealType();
        Long oldPrimaryPrice = getPrimaryPrice(property);

        // 지오코딩 재조회 여부를 판단하려면 바뀌기 전 주소가 필요하다
        String previousAddress = property.getAddress();

        property.setName(changes.getName());
        property.setType(changes.getType());
        property.setDealType(changes.getDealType());
        property.setAddress(changes.getAddress());
        // 구·동은 값이 함께 올 때만 바꾼다.
        //
        // 도로명 주소에는 동이 들어 있지 않아서("서울시 영등포구 당산로 222"), 이 두 컬럼이 비면
        // 그 매물이 어느 동네인지 알 방법이 사라진다. 지도에서 동별로 묶을 때도 이 값을 쓴다.
        // 그런데 수정 화면에서 주소를 다시 검색하지 않으면 요청에 이 값이 실려 오지 않는다.
        // 그대로 덮어쓰면 멀쩡히 저장돼 있던 동네 정보가 저장 한 번에 날아간다.
        if (changes.getSigungu() != null) property.setSigungu(changes.getSigungu());
        if (changes.getDong() != null) property.setDong(changes.getDong());

        property.setNeighborhoodId(resolveNeighborhoodId(property.getSigungu(), property.getDong()));
        updateCoordinates(property, previousAddress);
        property.setArea(changes.getArea());
        property.setFloor(changes.getFloor());
        property.setRoomCount(changes.getRoomCount());
        property.setBathroomCount(changes.getBathroomCount());
        property.setPrice(changes.getPrice());
        property.setDeposit(changes.getDeposit());
        property.setMonthlyDeposit(changes.getMonthlyDeposit());
        property.setMonthlyRent(changes.getMonthlyRent());
        normalizePriceFields(property);
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

        // 수정용 shadow DRAFT에 저장된 좌표와 AI 예측 결과를 실제 원본 매물에 복사함
        property.setLatitude(aiDraft.getLatitude());
        property.setLongitude(aiDraft.getLongitude());
        property.setStationDistance(aiDraft.getStationDistance());
        property.setAiPrice(aiDraft.getAiPrice());
        property.setAiDeposit(aiDraft.getAiDeposit());
        property.setAiMonthlyDeposit(aiDraft.getAiMonthlyDeposit());
        property.setAiMonthlyRent(aiDraft.getAiMonthlyRent());

        // 기존 매물 수정 완료 후 관리자 재승인 대기 PENDING으로 변경함
        property.setStatus(PropertyStatus.PENDING);

        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        Property saved = propertyRepository.save(property);

        // 수정 작업이 끝났으므로 임시로 사용한 hidden shadow DRAFT를 삭제함
        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        propertyRepository.delete(aiDraft);

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return PropertyResponseDto.of(saved);
    }

    // 거래 상태 변경 (게시중/거래진행중/거래완료). 거래완료·등록취소는 되돌릴 수 없음
    public PropertyResponseDto updateStatus(Long id, PropertyStatus newStatus, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getStatus() == PropertyStatus.DRAFT) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException(
                    "임시저장 매물은 관리자 승인 요청을 통해서만 제출할 수 있습니다.");
        }

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (newStatus == PropertyStatus.DRAFT
                || newStatus == PropertyStatus.PENDING
                || newStatus == PropertyStatus.ACTIVE) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    "DRAFT/PENDING/ACTIVE 상태는 이 API에서 직접 지정할 수 없습니다.");
        }

        if (property.getStatus() == PropertyStatus.COMPLETED
                || property.getStatus() == PropertyStatus.CANCELLED) {
            throw new IllegalStateException(
                    "거래완료 또는 등록취소된 매물은 상태를 변경할 수 없습니다.");
        }

        property.setStatus(newStatus);
        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    // 등록 취소. 되돌릴 수 없어서, 이미 취소된 매물이면 그냥 그대로 반환(중복 처리 방지)
    public PropertyResponseDto cancel(Long id, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getStatus() == PropertyStatus.DRAFT) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException(
                    "임시저장 매물은 매물 등록 페이지의 DRAFT 전용 흐름에서만 처리할 수 있습니다.");
        }

        if (property.getStatus() == PropertyStatus.CANCELLED) {
            return PropertyResponseDto.of(property);
        }

        property.setStatus(PropertyStatus.CANCELLED);
        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    public PropertyResponseDto toggleVisibility(Long id, String email) {
        Property property = findMyPropertyOrThrow(id, email);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getStatus() == PropertyStatus.DRAFT) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException(
                    "임시저장 매물은 매물 등록 페이지의 DRAFT 전용 흐름에서만 처리할 수 있습니다.");
        }

        property.setVisible(!property.getVisible());
        return PropertyResponseDto.of(propertyRepository.save(property));
    }

    public PropertyResponseDto insert(Property bean, List<MultipartFile> files, String email) {
        // 매물이 어느 사무소 것인지는 로그인한 사람을 보고 서버가 정한다.
        // 요청 본문의 agency 값은 신뢰하지 않고 덮어쓴다 — 그대로 두면 남의 사무소 번호를
        // 넣어 그 사무소 명의로 매물을 등록할 수 있기 때문이다.
        bean.setAgency(myAgencyService.findMyAgency(email));
        bean.setNeighborhoodId(resolveNeighborhoodId(bean.getSigungu(), bean.getDong()));

        kakaoGeocodingService.findCoordinates(bean.getAddress()).ifPresent(coordinates -> {
            bean.setLatitude(coordinates.latitude());
            bean.setLongitude(coordinates.longitude());
        });
        normalizePriceFields(bean);
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

        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        return propertyRepository.findByAgencyIdAndStatusNotOrderByCreatedAtDesc(
                        agency.getId(),
                        PropertyStatus.DRAFT,
                        Pageable.unpaged()
                )
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

        boolean dealTypeChosen = condition.getDealType() != null && !condition.getDealType().isBlank();
        String sort = condition.getSort();
        boolean isPriceSort = "PRICE_ASC".equalsIgnoreCase(sort) || "PRICE_DESC".equalsIgnoreCase(sort);
        String effectiveSort = (!dealTypeChosen && isPriceSort) ? "LATEST" : sort;

        return found.stream()
                .map(PropertySearchDto::of)
                .sorted(comparatorOf(effectiveSort))
                .toList();
    }

    // 매물 확인 화면 - 매물유형 탭을 고르면 그 유형에 실제 있는 거래유형만 버튼으로 보여준다.
    @Transactional(readOnly = true)
    public List<String> findAvailableDealTypes(String type) {
        return propertyRepository.findDistinctDealTypes(PropertyStatus.ACTIVE, toType(type))
                .stream()
                .map(Enum::name)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> browseListings(String type, String dealType, String sort, int page, int size) {
        PropertyType typeEnum = toType(type);
        DealType dealTypeEnum = toDealType(dealType);

        boolean dealTypeChosen = dealTypeEnum != null;
        boolean isPriceSort = "PRICE_ASC".equalsIgnoreCase(sort) || "PRICE_DESC".equalsIgnoreCase(sort);
        String effectiveSort = (!dealTypeChosen && isPriceSort) ? "LATEST" : sort;

        Pageable pageable = PageRequest.of(page, size, toSort(effectiveSort));
        Page<Property> result = propertyRepository.findForListings(PropertyStatus.ACTIVE, typeEnum, dealTypeEnum, pageable);

        return Map.of(
                "content", result.getContent().stream().map(PropertySearchDto::of).toList(),
                "totalCount", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "page", page
        );
    }

    private Sort toSort(String sort) {
        String key = (sort == null || sort.isBlank()) ? "LATEST" : sort.toUpperCase();

        return switch (key) {
            case "PRICE_ASC" -> Sort.by("comparablePrice").ascending();
            case "PRICE_DESC" -> Sort.by("comparablePrice").descending();
            case "AREA_ASC" -> Sort.by("area").ascending();
            case "AREA_DESC" -> Sort.by("area").descending();
            default -> Sort.by("createdAt").descending();
        };
    }

    // 정렬은 DB 대신 여기서 한다.
    // 대표 금액이 거래 유형마다 다른 칸에 들어 있어(매매/전세/월세) DTO 로 바꾼 뒤 비교하는 편이 단순하다.
    // 값이 비어 있는 매물이 섞여도 오류가 나지 않게 null 은 항상 뒤로 보낸다.
    private Comparator<PropertySearchDto> comparatorOf(String sort) {
        String key = (sort == null || sort.isBlank()) ? "LATEST" : sort.toUpperCase();

        return switch (key) {
            case "PRICE_ASC" -> Comparator.comparing(PropertySearchDto::getComparablePrice,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "PRICE_DESC" -> Comparator.comparing(PropertySearchDto::getComparablePrice,
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

    // 신규 또는 기존 임시저장 매물을 같은 DRAFT 행에 저장·갱신하는 메서드임
    @Transactional
    public PropertyResponseDto saveDraft(
            Long draftId,
            Property incoming,
            List<MultipartFile> newFiles,
            String email) {

        Property draft;
        boolean predictionInputsChanged;

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (draftId == null) {
            draft = new Property();
            draft.setAgency(myAgencyService.findMyAgency(email));
            // 새 Property를 사용자 임시저장 상태 DRAFT로 지정함
            draft.setStatus(PropertyStatus.DRAFT);

            // true DRAFT = 사용자가 매물 등록 페이지에서 직접 만든 임시저장.
            // status가 DRAFT이므로 일반 검색에는 절대 노출되지 않음
            // 사용자 신규등록 DRAFT로 구분하기 위해 visible=true로 지정함
            draft.setVisible(true);

            predictionInputsChanged = true;
        } else {
            draft = findMyUserDraftOrThrow(draftId, email);
            predictionInputsChanged = !samePredictionInputs(draft, incoming);
        }

        copyFormFields(draft, incoming);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (predictionInputsChanged) {
            clearAiPrediction(draft);
        }

        // 기존 이미지 중 사용자가 유지한 것만 남김
        List<Long> keepIds = incoming.getKeepImageIds() != null
                ? incoming.getKeepImageIds()
                : draft.getImages().stream()
                .map(PropertyImage::getId)
                .toList();

        List<PropertyImage> remaining = new ArrayList<>();

        // 대상 데이터를 순회하면서 필요한 처리 반복함
        for (PropertyImage image : draft.getImages()) {
            // 현재 값/권한/상태가 조건을 만족하는지 확인함
            if (image.getId() != null && keepIds.contains(image.getId())) {
                remaining.add(image);
            } else {
                propertyImageService.deleteFile(image.getUrl());
            }
        }

        int newFileCount = newFiles == null
                ? 0
                : (int) newFiles.stream()
                .filter(file -> file != null && !file.isEmpty())
                .count();

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (remaining.size() + newFileCount > PropertyImageService.MAX_IMAGE_COUNT) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    "사진은 최대 " + PropertyImageService.MAX_IMAGE_COUNT + "장까지 등록할 수 있습니다.");
        }

        remaining.addAll(propertyImageService.buildImages(draft, newFiles));

        // 대상 데이터를 순회하면서 필요한 처리 반복함
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setSortOrder(i);
            remaining.get(i).setIsMain(i == 0);
        }

        draft.getImages().clear();
        draft.getImages().addAll(remaining);

        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        Property saved = propertyRepository.save(draft);
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return PropertyResponseDto.of(saved);
    }

    // 현재 중개인의 사용자용 DRAFT 목록을 최근 수정순으로 조회하는 메서드임
    @Transactional(readOnly = true)
    public List<PropertyDraftSummaryDto> findMyDrafts(String email) {
        Agency agency = myAgencyService.findMyAgency(email);

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return propertyRepository
                .findByAgencyIdAndStatusAndVisibleTrueOrderByUpdatedAtDesc(
                        agency.getId(),
                        PropertyStatus.DRAFT
                )
                .stream()
                .map(PropertyDraftSummaryDto::of)
                .toList();
    }

    // 이어 작성할 단일 사용자 DRAFT 상세정보를 조회하는 메서드임
    @Transactional(readOnly = true)
    public PropertyResponseDto findMyDraft(Long draftId, String email) {
        Property draft = findMyUserDraftOrThrow(draftId, email);
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return PropertyResponseDto.of(draft);
    }

    // FastAPI 시세예측에 필요한 매물 입력값이 모두 채워졌는지 검증하는 메서드임
    private void validateAiInputs(Property property) {
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getType() == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("매물 유형을 입력해 주세요.");
        }
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getDealType() == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("거래 유형을 입력해 주세요.");
        }
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getAddress() == null || property.getAddress().isBlank()) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("주소를 입력해 주세요.");
        }
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getSigungu() == null || property.getSigungu().isBlank()) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("시군구 정보가 없습니다. 주소 검색으로 주소를 다시 선택해 주세요.");
        }
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getArea() == null || property.getArea().signum() <= 0) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("전용면적을 입력해 주세요.");
        }
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getFloor() == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("층수를 입력해 주세요.");
        }
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getBuildYear() == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException("건축년도를 입력해 주세요.");
        }
    }

    // Property.sigungu를 FastAPI districtName으로 사용할 수 있는지 확인하는 메서드임
    private String requireDistrictName(Property property) {
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (property.getSigungu() == null || property.getSigungu().isBlank()) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    "시군구 정보가 없습니다. 주소 검색으로 주소를 다시 선택해 주세요."
            );
        }

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return property.getSigungu().trim();
    }

    // 주소를 좌표로 바꾸고 FastAPI 시세예측을 호출해 AI 결과를 Property에 반영하는 메서드임
    private MlPriceResponse applyCoordinatesAndAiOrThrow(Property property) {
        validateAiInputs(property);

        KakaoGeocodingService.Coordinates coordinates =
                // 입력 주소를 Kakao 지오코딩으로 위경도 좌표로 변환함
                kakaoGeocodingService.findCoordinates(property.getAddress())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "입력한 주소의 좌표를 찾을 수 없습니다."));

        property.setLatitude(coordinates.latitude());
        property.setLongitude(coordinates.longitude());

        String districtName = requireDistrictName(property);

        MlPriceRequest request = new MlPriceRequest(
                property.getType().name(),
                property.getDealType().name(),
                districtName,
                property.getArea().doubleValue(),
                property.getFloor(),
                property.getBuildYear(),
                property.getLatitude(),
                property.getLongitude()
        );

        MlPriceResponse response;
        // 외부 호출/변환 중 오류가 날 수 있어 예외 처리 범위로 묶어둠
        try {
            // Spring에서 FastAPI 시세예측 API를 호출함
            response = mlClient.predictPrice(request);
        } catch (Exception e) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException(
                    "ML 서버 시세예측에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (response == null) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalStateException("ML 서버에서 시세예측 결과를 받지 못했습니다.");
        }

        property.setAiPrice(response.aiPrice());
        property.setAiDeposit(response.aiDeposit());
        property.setAiMonthlyDeposit(response.aiMonthlyDeposit());
        property.setAiMonthlyRent(response.aiMonthlyRent());
        property.setStationDistance(response.stationDistance());

        ensureAiPredictionExists(property);
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return response;
    }

    // 저장된 신규등록 DRAFT를 대상으로 AI 시세예측을 실행하고 결과를 저장하는 메서드임
    @Transactional
    public AiPricePreviewResponseDto predictDraftAi(Long draftId, String email) {
        Property draft = findMyUserDraftOrThrow(draftId, email);

        MlPriceResponse mlResponse = applyCoordinatesAndAiOrThrow(draft);
        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        Property saved = propertyRepository.save(draft);

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return new AiPricePreviewResponseDto(
                saved.getId(),
                saved.getAiPrice(),
                saved.getAiDeposit(),
                saved.getAiMonthlyDeposit(),
                saved.getAiMonthlyRent(),
                saved.getStationDistance(),
                mlResponse.modelVersion()
        );
    }

    // 최종 검증과 AI 결과 존재를 확인한 뒤 DRAFT를 PENDING으로 전환하는 메서드임
    @Transactional
    public PropertyResponseDto submitDraft(Long draftId, String email) {
        Property draft = findMyUserDraftOrThrow(draftId, email);

        // DRAFT를 PENDING으로 제출하기 직전에 최종 필수값 검증 실행함
        validateFinalProperty(draft);

        Map<String, String> pricingErrors = validatePricingFields(draft);
        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (!pricingErrors.isEmpty()) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    pricingErrors.values().iterator().next());
        }

        validateAiInputs(draft);
        ensureAiPredictionExists(draft);

        // 최종 제출할 DRAFT를 관리자 승인대기 PENDING으로 변경함
        draft.setStatus(PropertyStatus.PENDING);
        // 제출된 매물이 승인 후 공개될 수 있도록 visible=true를 유지함
        draft.setVisible(true);

        // FastAPI 호출 없음.
        // PENDING으로 바뀐 DRAFT와 저장된 AI 결과를 DB에 저장함
        Property saved = propertyRepository.save(draft);
        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return PropertyResponseDto.of(saved);
    }

    // Bean Validation의 최종 제출용 그룹을 실행해 미완성 매물을 차단하는 메서드임
    private void validateFinalProperty(Property property) {
        Set<ConstraintViolation<Property>> violations =
                // Bean Validation 규칙을 직접 실행해 최종 입력값 검증함
                validator.validate(property, PropertyFinalValidation.class);

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (!violations.isEmpty()) {
            // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
            throw new IllegalArgumentException(
                    violations.iterator().next().getMessage());
        }
    }

    // 기존 공개 매물을 직접 건드리지 않고 hidden shadow DRAFT에서 수정용 AI 예측을 수행하는 메서드임
    @Transactional
    public AiPricePreviewResponseDto predictEditAi(
            Long originalId,
            Long aiDraftId,
            Property incoming,
            String email) {

        // 원본 소유권 확인. 원본은 이 시점에 수정하지 않음
        findMyPropertyOrThrow(originalId, email);

        Property aiDraft;

        // 현재 값/권한/상태가 조건을 만족하는지 확인함
        if (aiDraftId == null) {
            aiDraft = new Property();
            aiDraft.setAgency(myAgencyService.findMyAgency(email));
            // 기존 매물 수정용 shadow Property를 DRAFT 상태로 지정함
            aiDraft.setStatus(PropertyStatus.DRAFT);
            // 수정용 shadow DRAFT가 사용자 임시저장 목록에 섞이지 않도록 visible=false로 지정함
            aiDraft.setVisible(false);
        } else {
            aiDraft = findMyDraftOrThrow(aiDraftId, email);

            // 현재 값/권한/상태가 조건을 만족하는지 확인함
            if (Boolean.TRUE.equals(aiDraft.getVisible())) {
                // 조건을 만족하지 않으면 이후 처리를 중단하도록 예외 발생시킴
                throw new IllegalArgumentException(
                        "신규 등록 임시저장 매물을 수정용 AI DRAFT로 사용할 수 없습니다.");
            }
        }

        copyFormFields(aiDraft, incoming);
        clearAiPrediction(aiDraft);

        MlPriceResponse mlResponse = applyCoordinatesAndAiOrThrow(aiDraft);

        // Repository를 통해 필요한 DB 데이터를 조회/변경함
        Property saved = propertyRepository.save(aiDraft);

        // 처리 완료된 결과를 호출한 쪽으로 반환함
        return new AiPricePreviewResponseDto(
                saved.getId(),
                saved.getAiPrice(),
                saved.getAiDeposit(),
                saved.getAiMonthlyDeposit(),
                saved.getAiMonthlyRent(),
                saved.getStationDistance(),
                mlResponse.modelVersion()
        );
    }
}