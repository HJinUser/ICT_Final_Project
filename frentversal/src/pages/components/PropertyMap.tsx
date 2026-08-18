import { useEffect, useRef, useState } from 'react';

import type { PropertySearchItem } from '../../types/PropertySearch';
import { findCenter, findDistrictBoundary, loadKakaoSdk } from '../../utils/kakaoMap';

// 지도 검색 가운데 영역.
//
// 확대 정도(레벨)에 따라 표식이 세 가지로 바뀐다.
//   많이 확대  : 매물 하나마다 가격 표식        (4.9억)
//   조금 축소  : 같은 '동'끼리 묶어 매물 개수    (반포동 3)
//   많이 축소  : 같은 '구'끼리 묶어 매물 개수    (서초구 12)
//
// 카카오 지도의 레벨은 숫자가 클수록 넓게 보인다(1이 가장 확대).
//
// 화면정의서 3-3 : 중개인은 자기가 등록한 매물 표식이 다른 것과 구분되어야 한다.
// 묶음 표식에는 이 구분을 쓰지 않는다. 여러 사무소의 매물이 섞여 있기 때문이다.

// 지도를 처음 띄울 때의 중심 좌표 (강남역). 목록에 좌표가 하나도 없을 때만 쓰인다.
const DEFAULT_CENTER = { latitude: 37.4979, longitude: 127.0276 };
const DEFAULT_LEVEL = 6;

// 회원이 사는 곳으로 화면을 옮길 때의 확대 정도.
// 동네가 한눈에 들어오면서 주변 매물도 같이 보이는 수준으로 잡았다.
const MEMBER_AREA_LEVEL = 6;

// 어느 레벨부터 묶어서 보여 줄지.
// 이 값보다 크면(= 더 넓게 보면) 묶는다.
const DONG_GROUP_LEVEL = 6; // 6 이상이면 동끼리 묶는다
const GU_GROUP_LEVEL = 8;   // 8 이상이면 구끼리 묶는다

// 필터에서 동까지 고른 경우의 확대 정도.
// DONG_GROUP_LEVEL 보다 한 단계 더 확대해서, 동을 고른 순간 매물이 묶이지 않고
// 하나씩 보이게 한다(동 하나만 보는데 "○○동 3"으로 묶여 있으면 볼 것이 없다).
const DONG_AREA_LEVEL = 5;

interface Props {
    properties: PropertySearchItem[];
    myAgencyId?: number | null;      // 로그인한 중개인의 사무소 (없으면 구분하지 않는다)
    selectedId?: number | null;      // 목록에서 고른 매물 (지도에서 강조)
    onSelect?: (id: number) => void; // 매물 표식을 눌렀을 때
    onSelectGroup?: (names: string[]) => void; // 묶음 표식을 눌렀을 때 (그 지역 이름)

    // 지도를 처음 열 때 보여 줄 곳 (회원이 가입할 때 적은 주소).
    // 매물이 있으면 그 매물들에 맞추고, 없을 때 이 주소로 화면을 옮긴다.
    initialCenterAddress?: string | null;

    // 지도 위에 테두리로 강조해서 보여 줄 구 이름 ("서초구").
    // 지도 검색에 처음 들어왔을 때는 회원이 사는 구, 필터에서 구를 고르면 그 구가 여기로 들어온다.
    // null 이면 강조 표시를 지운다.
    highlightRegion?: string | null;

    // 필터에서 고른 동 이름 ("당산동"). 구까지만 고른 상태면 null 이다.
    // 동을 고르면 구 경계 대신 그 동네로 확대해서 옮긴다. 경계선은 구 그대로 둔다
    // (동 경계 데이터는 없고, 어느 구 안인지 보이는 편이 길을 잡기 쉽다).
    highlightDong?: string | null;

    // "고른 지역이 화면에 들어오게 시야를 다시 맞춰라"는 신호. 값이 바뀔 때만 반응한다.
    // 화면에서 "선택 조건 적용"을 누를 때마다 올려 주므로, 같은 지역을 그대로 두고 지도만
    // 옮겨 둔 뒤 다시 적용해도 그 지역으로 돌아온다.
    focusNonce?: number;
}

// 표식에 적을 짧은 가격 문구. "전세 4억 9,000" -> "4.9억"
function toShortPrice(manwon: number | null): string {
    if (manwon == null) return '-';

    if (manwon >= 10000) {
        const eok = manwon / 10000;
        // 4.9억 처럼 소수 한 자리까지만. 5.0억이면 5억으로 줄인다.
        return `${Number(eok.toFixed(1))}억`;
    }

    return `${manwon.toLocaleString()}만`;
}

// 좌표가 있는 매물들을 지역 이름별로 묶는다.
// 표식 위치는 그 지역 매물들의 좌표 평균으로 정한다.
function groupByArea(properties: PropertySearchItem[], key: 'gu' | 'dong') {
    const groups = new Map<string, { name: string; count: number; latSum: number; lngSum: number }>();

    properties.forEach((property) => {
        if (property.latitude == null || property.longitude == null) return;

        // 주소에서 구·동을 못 뽑은 매물은 묶을 기준이 없어 개별로 남긴다
        const name = property[key];
        if (!name) return;

        const group = groups.get(name) ?? { name, count: 0, latSum: 0, lngSum: 0 };

        group.count += 1;
        group.latSum += property.latitude;
        group.lngSum += property.longitude;

        groups.set(name, group);
    });

    return [...groups.values()].map((group) => ({
        name: group.name,
        count: group.count,
        latitude: group.latSum / group.count,
        longitude: group.lngSum / group.count,
    }));
}

function PropertyMap({
    properties,
    myAgencyId,
    selectedId,
    onSelect,
    onSelectGroup,
    initialCenterAddress,
    highlightRegion,
    highlightDong,
    focusNonce,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    // 지도는 한 번만 만들고 계속 쓴다.
    // 표식을 다시 그릴 때마다 지도를 새로 만들면 사용자가 옮겨 둔 위치와 확대 정도가 초기화된다.
    const mapRef = useRef<any>(null);

    // 지금 지도에 올려 둔 표식들. 다시 그리기 전에 이 목록을 지운다.
    const overlaysRef = useRef<any[]>([]);

    // 지금 그려 둔 구 경계선. 새로 그리기 전에 지운다.
    const boundaryRef = useRef<any>(null);

    // 마지막으로 시야를 맞춘 대상. "구|동|신호" 를 한 문자열로 합쳐 둔다.
    // 이 값이 그대로면 아무것도 하지 않는다 — 표식이 다시 그려지는 등 다른 이유로
    // 이 효과가 재실행될 때마다 시야를 잡으면, 사용자가 옮겨 둔 지도가 자꾸 되돌아간다.
    const lastFocusKeyRef = useRef<string | null>(null);

    // 지도 범위를 한 번 맞췄는지 기억해 둔다.
    // 매번 맞추면 사용자가 지도를 옮기거나 확대할 때마다 원위치로 돌아가 버린다.
    const fittedRef = useRef(false);

    const [sdkLoaded, setSdkLoaded] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [level, setLevel] = useState(DEFAULT_LEVEL);

    // ── 지도 만들기 (처음 한 번) ─────────────────────────────
    useEffect(() => {
        let cancelled = false;

        loadKakaoSdk()
            .then(() => {
                if (cancelled) return;

                const kakao = window.kakao;
                const container = containerRef.current;

                if (!kakao?.maps || !container || mapRef.current) return;

                kakao.maps.load(() => {
                    if (cancelled || mapRef.current) return;

                    const map = new kakao.maps.Map(container, {
                        center: new kakao.maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
                        level: DEFAULT_LEVEL,
                    });

                    // 확대 정도가 바뀌면 표식 종류(개별/동/구)를 다시 정해야 한다
                    kakao.maps.event.addListener(map, 'zoom_changed', () => setLevel(map.getLevel()));

                    mapRef.current = map;
                    setSdkLoaded(true);

                    // 회원이 사는 곳으로 화면을 옮겨 둔다.
                    // 매물이 있으면 아래 표식 그리기에서 그 매물들에 맞춰 다시 옮겨지므로,
                    // 이 위치는 "보여 줄 매물이 없을 때" 남는 시작 위치가 된다.
                    //
                    // highlightRegion 에 경계 데이터가 있으면(서울 25개 구) 그 구 경계 효과가
                    // 화면을 맞춰 주므로 여기서는 건드리지 않는다. 두 효과가 동시에 화면을
                    // 움직이면 지도가 두 번 튀어 보인다. 경계 데이터가 없는 지역일 때만
                    // (서울 밖이거나 아직 구를 모를 때) 주소 좌표로 대신 맞춘다.
                    if (initialCenterAddress && !findDistrictBoundary(highlightRegion ?? '')) {
                        findCenter(initialCenterAddress).then((center) => {
                            if (cancelled || !center) return;

                            map.setCenter(new kakao.maps.LatLng(center.latitude, center.longitude));
                            map.setLevel(MEMBER_AREA_LEVEL);
                        });
                    }
                });
            })
            .catch((error: Error) => {
                if (!cancelled) setLoadError(error.message);
            });

        return () => { cancelled = true; };
    }, []);

    // ── 표식 다시 그리기 (매물 목록이나 확대 정도가 바뀔 때) ──
    useEffect(() => {
        const kakao = window.kakao;
        const map = mapRef.current;

        if (!kakao?.maps || !map) return;

        // 이전 표식을 모두 걷어낸다
        overlaysRef.current.forEach((overlay) => overlay.setMap(null));
        overlaysRef.current = [];

        const bounds = new kakao.maps.LatLngBounds();

        // 표식 하나를 지도에 올리고 목록에 담아 둔다
        const addOverlay = (latitude: number, longitude: number, content: HTMLElement) => {
            const position = new kakao.maps.LatLng(latitude, longitude);

            const overlay = new kakao.maps.CustomOverlay({ map, position, content, yAnchor: 1 });

            overlaysRef.current.push(overlay);
            bounds.extend(position);
        };

        if (level >= DONG_GROUP_LEVEL) {
            // 묶어서 보여 주기 : 넓게 볼수록 구 단위로 묶는다
            const key = level >= GU_GROUP_LEVEL ? 'gu' : 'dong';

            groupByArea(properties, key).forEach((group) => {
                const pin = document.createElement('button');

                pin.className = 'marker cluster';
                pin.title = `${group.name} 매물 ${group.count}건`;

                // 지역 이름과 개수를 함께 보여 준다 (가격은 묶으면 의미가 없다)
                const name = document.createElement('span');
                name.className = 'cluster-name';
                name.textContent = group.name;

                const count = document.createElement('span');
                count.className = 'cluster-count';
                count.textContent = String(group.count);

                pin.append(name, count);

                // 누르면 그 지역 매물만 목록에 남긴다
                pin.onclick = () => onSelectGroup?.([group.name]);

                addOverlay(group.latitude, group.longitude, pin);
            });
        } else {
            // 개별 매물 : 가격을 보여 준다
            properties.forEach((property) => {
                if (property.latitude == null || property.longitude == null) return;

                // 표식은 문자열 대신 DOM 으로 만든다.
                // 매물명에 <, > 같은 글자가 들어와도 HTML 로 해석되지 않게 하기 위함이다.
                const pin = document.createElement('button');

                pin.className = 'marker';
                pin.textContent = toShortPrice(property.price);
                pin.title = property.name;

                // 시세보다 싸게 나온 매물은 눈에 띄게 표시한다 (기획서: 저평가 매물 강조)
                if (property.priceLevel === 'LOW') pin.classList.add('deal');

                // 내가 등록한 매물과 지금 고른 매물을 구분한다
                if (myAgencyId != null && property.agencyId === myAgencyId) pin.classList.add('mine');
                if (selectedId === property.id) pin.classList.add('on');

                pin.onclick = () => onSelect?.(property.id);

                addOverlay(property.latitude, property.longitude, pin);
            });
        }

        // 지역을 고른 상태면 아래 "고른 지역으로 시야 옮기기" 쪽이 화면을 맡으므로 여기서는 건드리지 않는다.
        // 매물 위치에 맞추면 그 지역에 매물이 한두 건일 때 지나치게 확대되어
        // 방금 고른 지역이 어디인지 알 수 없게 된다.
        const framedByArea = Boolean(highlightDong)
            || Boolean(highlightRegion && findDistrictBoundary(highlightRegion));

        // 검색 결과가 바뀐 직후에만 범위를 맞춘다
        if (!bounds.isEmpty() && !fittedRef.current && !framedByArea) {
            map.setBounds(bounds);
            fittedRef.current = true;
        }
    }, [properties, level, myAgencyId, selectedId, onSelect, onSelectGroup, sdkLoaded, highlightRegion, highlightDong]);

    // 검색 조건이 바뀌어 목록이 통째로 달라지면 범위를 다시 맞춘다
    useEffect(() => {
        fittedRef.current = false;
    }, [properties]);

    // ── 구 경계선 강조 표시 ────────────────────────────────
    // 지도 검색에 처음 들어왔을 때(회원이 사는 구)와, 필터에서 구를 고를 때 이 효과가 돈다.
    useEffect(() => {
        const kakao = window.kakao;
        const map = mapRef.current;

        if (!kakao?.maps || !map) return;

        // 이전 경계선을 지운다
        boundaryRef.current?.setMap(null);
        boundaryRef.current = null;

        if (!highlightRegion) return;

        const district = findDistrictBoundary(highlightRegion);
        if (!district) return; // 서울 25개 구 밖의 지역이면 경계 데이터가 없다

        // Polygon 좌표는 [ [바깥 테두리], [구멍1], ... ] 형태다.
        // 서울 구는 섬(밖에 딸린 작은 땅) 없이 테두리 하나뿐이라 첫 번째 고리만 쓴다.
        const path = district.coordinates[0].map(
            ([longitude, latitude]) => new kakao.maps.LatLng(latitude, longitude),
        );

        boundaryRef.current = new kakao.maps.Polygon({
            map,
            path,
            strokeWeight: 3,
            strokeColor: '#4B0082',
            strokeOpacity: 0.85,
            fillColor: '#4B0082',
            fillOpacity: 0.06,
        });
    }, [highlightRegion, sdkLoaded]);

    // ── 고른 지역으로 시야 옮기기 ──────────────────────────
    // 위 경계선 그리기와 일부러 나눠 두었다. 한 곳에서 둘 다 하면
    // "동을 골랐는데 구 경계에 맞춰 다시 넓어지는" 식으로 서로 화면을 뺏는다.
    //
    // 동까지 골랐으면 그 동네로 확대하고, 구까지만 골랐으면 구 전체가 들어오게 맞춘다.
    useEffect(() => {
        const kakao = window.kakao;
        const map = mapRef.current;

        if (!kakao?.maps || !map) return;

        // 같은 대상에 이미 맞춰 두었으면 사용자가 옮겨 둔 지도를 건드리지 않는다.
        // "선택 조건 적용"을 누르면 focusNonce 가 바뀌므로 그때는 다시 맞춘다.
        const focusKey = `${highlightRegion ?? ''}|${highlightDong ?? ''}|${focusNonce ?? 0}`;
        if (lastFocusKeyRef.current === focusKey) return;
        lastFocusKeyRef.current = focusKey;

        if (!highlightRegion) return;

        // 동까지 골랐으면 주소를 좌표로 바꿔서 그 동네로 확대한다.
        // 동 경계 데이터는 없어서 경계 대신 중심 좌표 + 고정 확대율을 쓴다.
        if (highlightDong) {
            let cancelled = false;

            findCenter(`서울시 ${highlightRegion} ${highlightDong}`).then((center) => {
                // 좌표를 받아오는 사이에 사용자가 다른 지역을 골랐으면 늦게 온 결과는 버린다
                if (cancelled || lastFocusKeyRef.current !== focusKey || !center) return;

                map.setCenter(new kakao.maps.LatLng(center.latitude, center.longitude));
                map.setLevel(DONG_AREA_LEVEL);
                setLevel(DONG_AREA_LEVEL); // zoom_changed 가 오지 않는 경우를 대비해 직접 반영
            });

            return () => { cancelled = true; };
        }

        // 구까지만 골랐으면 구 전체가 화면에 들어오게 맞춘다
        const district = findDistrictBoundary(highlightRegion);
        if (!district) return; // 서울 25개 구 밖이면 경계 데이터가 없다

        const bounds = new kakao.maps.LatLngBounds();
        district.coordinates[0].forEach(([longitude, latitude]) => {
            bounds.extend(new kakao.maps.LatLng(latitude, longitude));
        });

        map.setBounds(bounds);
    }, [highlightRegion, highlightDong, focusNonce, sdkLoaded]);

    const pinnableCount = properties.filter((property) => property.latitude != null).length;
    const grouping = level >= GU_GROUP_LEVEL ? '구' : level >= DONG_GROUP_LEVEL ? '동' : null;

    // 확대 / 축소
    const zoom = (delta: number) => {
        const map = mapRef.current;
        if (!map) return;

        map.setLevel(map.getLevel() + delta);
        setLevel(map.getLevel()); // zoom_changed 가 오지 않는 경우를 대비해 직접 반영한다
    };

    // 내 위치로 이동 (기획서 : 내 위치 기준)
    const moveToMyLocation = () => {
        const map = mapRef.current;

        if (!map || !navigator.geolocation) {
            window.alert('이 브라우저에서는 현재 위치를 쓸 수 없습니다.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const kakao = window.kakao;
                map.setCenter(new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude));
                map.setLevel(5); // 내 주변을 볼 정도로 확대한다
                setLevel(5);
            },
            () => window.alert('현재 위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.'),
        );
    };

    return (
        <div className="map-canvas">
            {/* 카카오맵이 이 div 안에 그려진다 */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* 지도를 그리지 못했을 때만 안내 문구를 덮어 보여 준다 */}
            {!sdkLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <div>
                        <p className="xs dim">{loadError || '지도를 불러오는 중입니다…'}</p>
                        <p className="xs dim" style={{ marginTop: 6 }}>표시 예정 매물 {pinnableCount}건</p>
                    </div>
                </div>
            )}

            {/* 확대 · 축소 · 내 위치 */}
            {sdkLoaded && (
                <div className="map-controls">
                    <button className="map-control" onClick={() => zoom(-1)} aria-label="확대">＋</button>
                    <button className="map-control" onClick={() => zoom(1)} aria-label="축소">－</button>
                    <button className="map-control" onClick={moveToMyLocation} aria-label="내 위치">⌖</button>
                </div>
            )}

            {/* 지금 묶어서 보고 있다는 안내 */}
            {sdkLoaded && grouping && (
                <p className="map-hint">{grouping}별 매물 수로 보고 있습니다. 확대하면 매물이 하나씩 보입니다.</p>
            )}

            {/* 좌표가 아직 없는 매물이 있으면 알려 준다 */}
            {sdkLoaded && pinnableCount < properties.length && (
                <p className="map-hint bottom">
                    {properties.length - pinnableCount}건은 위치 정보가 없어 지도에 표시되지 않습니다.
                </p>
            )}
        </div>
    );
}

export default PropertyMap;
