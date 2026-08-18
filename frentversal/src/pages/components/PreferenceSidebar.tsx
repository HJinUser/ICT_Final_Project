/*
  맞춤 추천 화면 왼쪽에 붙는 취향 설정 패널.

  여기서 고친 값을 저장하면 오른쪽 추천 목록이 곧바로 다시 계산된다.
  저장 자체는 이 부품이 하지 않고, 완성된 취향 값을 부모에게 올려 준다.
  추천 목록을 다시 불러오는 일까지 부모가 함께 처리해야 순서가 꼬이지 않기 때문이다.
*/

import { useState } from 'react';

import type { Preference } from '../../types/Preference';
import { LIFESTYLE_OPTIONS } from '../../types/Preference';
import type { DealTypeCode, PropertyTypeCode } from '../../types/Recommendation';
import { DEAL_TYPE_OPTIONS, PROPERTY_TYPE_OPTIONS } from '../../types/Recommendation';
import type { TagResponse } from '../../types/Tag';
import { SEOUL_DISTRICTS } from '../../utils/seoulDistricts';
import '../../styles/PreferenceSidebar.css';

// 태그를 처음에 몇 개까지만 보여 줄지. 나머지는 더보기를 눌러야 나온다.
const TAG_PREVIEW_COUNT = 8;

interface Props {
    preference: Preference;
    tags: TagResponse[];
    saving: boolean;
    error: string;
    onChange: (next: Preference) => void;
    onSave: () => void;
}

function PreferenceSidebar({ preference, tags, saving, error, onChange, onSave }: Props) {
    const [tagExpanded, setTagExpanded] = useState(false);

    // 선호 지역 목록이 길어서 처음에는 접어 둔다.
    const [districtExpanded, setDistrictExpanded] = useState(false);

    // 항목 하나만 바꾼 새 취향을 부모에게 올려 준다.
    const update = <K extends keyof Preference>(key: K, value: Preference[K]) => {
        onChange({ ...preference, [key]: value });
    };

    // 이미 고른 값을 다시 누르면 선택을 푼다. 거래 유형은 하나만 고를 수 있다.
    const toggleDealType = (value: DealTypeCode) => {
        update('dealType', preference.dealType === value ? null : value);
    };

    // 매물 유형은 여러 개를 고를 수 있다.
    const togglePropertyType = (value: PropertyTypeCode) => {
        const selected = preference.propertyTypes.includes(value)
            ? preference.propertyTypes.filter((item) => item !== value)
            : [...preference.propertyTypes, value];

        update('propertyTypes', selected);
    };

    const toggleDistrict = (district: string) => {
        const selected = preference.preferredDistricts.includes(district)
            ? preference.preferredDistricts.filter((item) => item !== district)
            : [...preference.preferredDistricts, district];

        update('preferredDistricts', selected);
    };

    const toggleTag = (tagId: number) => {
        const selected = preference.tagIds.includes(tagId)
            ? preference.tagIds.filter((item) => item !== tagId)
            : [...preference.tagIds, tagId];

        update('tagIds', selected);
    };

    /*
      숫자 입력칸의 값을 숫자로 바꾼다.

      빈칸은 0 이 아니라 null 로 둔다. 0 으로 두면 "0원 이상"이라는 조건이 걸린 것이 되어
      값을 지웠는데도 조건이 남아 있는 것처럼 동작하기 때문이다.
      숫자가 아닌 글자가 들어오면 마찬가지로 null 로 본다.
    */
    const toNumber = (value: string): number | null => {
        if (value.trim() === '') {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : null;
    };

    // 화면에 보여 줄 태그 목록. 접혀 있으면 앞쪽 몇 개만 보여 준다.
    const visibleTags = tagExpanded ? tags : tags.slice(0, TAG_PREVIEW_COUNT);

    // 선호 지역도 같은 방식으로 접어 둔다. 고른 지역은 접혀 있어도 계속 보여 준다.
    const visibleDistricts = districtExpanded
        ? SEOUL_DISTRICTS
        : SEOUL_DISTRICTS.filter(
            (district, index) => index < 6 || preference.preferredDistricts.includes(district),
        );

    // 거래 유형에 따라 다른 예산 입력칸을 보여 준다.
    // 전세를 찾는 사람에게 월세 칸까지 보여 주면 무엇을 채워야 할지 알기 어렵다.
    const renderBudget = () => {
        if (preference.dealType === 'SALE') {
            return (
                <div className="pref-range">
                    <input
                        type="number"
                        min={0}
                        placeholder="최소"
                        value={preference.saleMinPrice ?? ''}
                        onChange={(e) => update('saleMinPrice', toNumber(e.target.value))}
                    />
                    <span>~</span>
                    <input
                        type="number"
                        min={0}
                        placeholder="최대"
                        value={preference.saleMaxPrice ?? ''}
                        onChange={(e) => update('saleMaxPrice', toNumber(e.target.value))}
                    />
                </div>
            );
        }

        if (preference.dealType === 'MONTHLY') {
            return (
                <>
                    <div className="pref-sublabel">보증금</div>
                    <div className="pref-range">
                        <input
                            type="number"
                            min={0}
                            placeholder="최소"
                            value={preference.monthlyMinDeposit ?? ''}
                            onChange={(e) => update('monthlyMinDeposit', toNumber(e.target.value))}
                        />
                        <span>~</span>
                        <input
                            type="number"
                            min={0}
                            placeholder="최대"
                            value={preference.monthlyMaxDeposit ?? ''}
                            onChange={(e) => update('monthlyMaxDeposit', toNumber(e.target.value))}
                        />
                    </div>

                    <div className="pref-sublabel">월세</div>
                    <div className="pref-range">
                        <input
                            type="number"
                            min={0}
                            placeholder="최소"
                            value={preference.monthlyMinRent ?? ''}
                            onChange={(e) => update('monthlyMinRent', toNumber(e.target.value))}
                        />
                        <span>~</span>
                        <input
                            type="number"
                            min={0}
                            placeholder="최대"
                            value={preference.monthlyMaxRent ?? ''}
                            onChange={(e) => update('monthlyMaxRent', toNumber(e.target.value))}
                        />
                    </div>
                </>
            );
        }

        // 거래 유형을 고르지 않았거나 전세를 골랐으면 전세 예산을 받는다.
        return (
            <div className="pref-range">
                <input
                    type="number"
                    min={0}
                    placeholder="최소"
                    value={preference.jeonseMinDeposit ?? ''}
                    onChange={(e) => update('jeonseMinDeposit', toNumber(e.target.value))}
                />
                <span>~</span>
                <input
                    type="number"
                    min={0}
                    placeholder="최대"
                    value={preference.jeonseMaxDeposit ?? ''}
                    onChange={(e) => update('jeonseMaxDeposit', toNumber(e.target.value))}
                />
            </div>
        );
    };

    return (
        <aside className="pref-panel">
            <h2 className="pref-title">내 취향</h2>
            <p className="pref-desc">고친 내용을 저장하면 추천이 바로 다시 계산됩니다.</p>

            {error && <div className="pref-alert">{error}</div>}

            <div className="pref-group">
                <div className="pref-label">거래 유형</div>
                <div className="pref-chips">
                    {DEAL_TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={preference.dealType === option.value ? 'pref-chip on' : 'pref-chip'}
                            onClick={() => toggleDealType(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pref-group">
                <div className="pref-label">매물 유형</div>
                <div className="pref-chips">
                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={
                                preference.propertyTypes.includes(option.value) ? 'pref-chip on' : 'pref-chip'
                            }
                            onClick={() => togglePropertyType(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pref-group">
                <div className="pref-label">
                    예산 <span className="pref-unit">(만원)</span>
                </div>
                {renderBudget()}
            </div>

            <div className="pref-group">
                <div className="pref-label">
                    희망 면적 <span className="pref-unit">(제곱미터)</span>
                </div>
                <div className="pref-range">
                    <input
                        type="number"
                        min={0}
                        placeholder="최소"
                        value={preference.minArea ?? ''}
                        onChange={(e) => update('minArea', toNumber(e.target.value))}
                    />
                    <span>~</span>
                    <input
                        type="number"
                        min={0}
                        placeholder="최대"
                        value={preference.maxArea ?? ''}
                        onChange={(e) => update('maxArea', toNumber(e.target.value))}
                    />
                </div>
            </div>

            <div className="pref-group">
                <div className="pref-label">최소 방 개수</div>
                <div className="pref-chips">
                    {[1, 2, 3].map((count) => (
                        <button
                            key={count}
                            type="button"
                            className={preference.minRoomCount === count ? 'pref-chip on' : 'pref-chip'}
                            onClick={() =>
                                update('minRoomCount', preference.minRoomCount === count ? null : count)
                            }
                        >
                            {count === 3 ? '3개 이상' : `${count}개 이상`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pref-group">
                <div className="pref-label">중요하게 보는 것</div>
                <div className="pref-chips">
                    {LIFESTYLE_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            className={preference[option.key] ? 'pref-chip on' : 'pref-chip'}
                            onClick={() => update(option.key, !preference[option.key])}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pref-group">
                <div className="pref-label">관심 태그</div>

                {tags.length === 0 ? (
                    <p className="pref-empty">불러온 태그가 없습니다.</p>
                ) : (
                    <>
                        <div className="pref-chips">
                            {visibleTags.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className={preference.tagIds.includes(tag.id) ? 'pref-chip on' : 'pref-chip'}
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>

                        {tags.length > TAG_PREVIEW_COUNT && (
                            <button
                                type="button"
                                className="pref-more"
                                onClick={() => setTagExpanded(!tagExpanded)}
                            >
                                {tagExpanded ? '접기' : `더보기 (${tags.length - TAG_PREVIEW_COUNT}개)`}
                            </button>
                        )}
                    </>
                )}
            </div>

            <div className="pref-group">
                <div className="pref-label">선호 지역</div>
                <div className="pref-chips">
                    {visibleDistricts.map((district) => (
                        <button
                            key={district}
                            type="button"
                            className={
                                preference.preferredDistricts.includes(district) ? 'pref-chip on' : 'pref-chip'
                            }
                            onClick={() => toggleDistrict(district)}
                        >
                            {district}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    className="pref-more"
                    onClick={() => setDistrictExpanded(!districtExpanded)}
                >
                    {districtExpanded ? '접기' : '서울 전체 구 보기'}
                </button>
            </div>

            <button type="button" className="solid-btn pref-save" onClick={onSave} disabled={saving}>
                {saving ? '저장하는 중...' : '취향 설정'}
            </button>
        </aside>
    );
}

export default PreferenceSidebar;
