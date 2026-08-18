package com.brentversal.recommendation.dto;

import com.brentversal.member.entity.Member;
import com.brentversal.property.constant.DealType;
import com.brentversal.property.constant.PropertyType;
import com.brentversal.recommendation.entity.UserPreference;
import com.brentversal.tag.entity.Tag;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

// 저장해 둔 취향을 화면의 사이드바에 다시 채워 넣기 위한 응답이다.
// 요청(PreferenceRequestDto)과 항목을 똑같이 맞춰서, 프론트가 받은 값을 그대로 폼 상태로 쓸 수 있게 한다.
@Getter
@Setter
public class PreferenceResponseDto {

    private DealType dealType;
    private Set<PropertyType> propertyTypes = new HashSet<>();
    private Set<String> preferredDistricts = new HashSet<>();

    private Double minArea;
    private Double maxArea;
    private Integer minRoomCount;

    private Long saleMinPrice;
    private Long saleMaxPrice;
    private Long jeonseMinDeposit;
    private Long jeonseMaxDeposit;
    private Long monthlyMinDeposit;
    private Long monthlyMaxDeposit;
    private Long monthlyMinRent;
    private Long monthlyMaxRent;

    private boolean newBuildPreferred;
    private boolean stationPreferred;
    private boolean educationPreferred;
    private boolean parkPreferred;
    private boolean hospitalPreferred;
    private boolean conveniencePreferred;
    private boolean busPreferred;
    private boolean lowMaintenancePreferred;

    private Set<Long> tagIds = new HashSet<>();

    // 아직 한 번도 취향을 저장하지 않은 회원인지 화면이 알아야 안내 문구를 띄울 수 있다.
    private boolean saved;

    // 저장된 취향과 회원이 고른 태그를 화면용 응답으로 바꾸는 메서드다.
    // 취향을 아직 저장하지 않은 회원은 preference 가 null 로 들어오며, 이때는 비어 있는 응답을 준다.
    public static PreferenceResponseDto of(UserPreference preference, Member member) {
        PreferenceResponseDto dto = new PreferenceResponseDto();

        // 태그는 취향 저장 여부와 상관없이 회원이 직접 가지고 있으므로 먼저 담는다.
        if (member != null && member.getPreferredTags() != null) {
            dto.setTagIds(member.getPreferredTags().stream()
                    .map(Tag::getId)
                    .collect(Collectors.toCollection(HashSet::new)));
        }

        if (preference == null) {
            dto.setSaved(false);
            return dto;
        }

        dto.setSaved(true);
        dto.setDealType(preference.getPreferredDealType());
        dto.setPropertyTypes(new HashSet<>(preference.getPreferredPropertyTypes()));
        dto.setPreferredDistricts(new HashSet<>(preference.getPreferredDistricts()));

        dto.setMinArea(preference.getMinArea());
        dto.setMaxArea(preference.getMaxArea());
        dto.setMinRoomCount(preference.getMinRoomCount());

        dto.setSaleMinPrice(preference.getSaleMinPrice());
        dto.setSaleMaxPrice(preference.getSaleMaxPrice());
        dto.setJeonseMinDeposit(preference.getJeonseMinDeposit());
        dto.setJeonseMaxDeposit(preference.getJeonseMaxDeposit());
        dto.setMonthlyMinDeposit(preference.getMonthlyMinDeposit());
        dto.setMonthlyMaxDeposit(preference.getMonthlyMaxDeposit());
        dto.setMonthlyMinRent(preference.getMonthlyMinRent());
        dto.setMonthlyMaxRent(preference.getMonthlyMaxRent());

        dto.setNewBuildPreferred(preference.isNewBuildPreferred());
        dto.setStationPreferred(preference.isStationPreferred());
        dto.setEducationPreferred(preference.isEducationPreferred());
        dto.setParkPreferred(preference.isParkPreferred());
        dto.setHospitalPreferred(preference.isHospitalPreferred());
        dto.setConveniencePreferred(preference.isConveniencePreferred());
        dto.setBusPreferred(preference.isBusPreferred());
        dto.setLowMaintenancePreferred(preference.isLowMaintenancePreferred());

        return dto;
    }
}
