import { useEffect, useRef, useState } from 'react';

import type { PropertySearchItem } from '../types/PropertySearch';
import { loadKakaoSdk } from '../utils/kakaoMap';

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

// 어느 레벨부터 묶어서 보여 줄지.
// 이 값보다 크면(= 더 넓게 보면) 묶는다.
const DONG_GROUP_LEVEL = 6; // 6 이상이면 동끼리 묶는다
const GU_GROUP_LEVEL = 8;   // 8 이상이면 구끼리 묶는다

interface Props {
    properties: PropertySearchItem[];
    myAgencyId?: number | null;      // 로그인한 중개인의 사무소 (없으면 구분하지 않는다)
    selectedId?: number | null;      // 목록에서 고른 매물 (지도에서 강조)
    onSelect?: (id: number) => void; // 매물 표식을 눌렀을 때
    onSelectGroup?: (names: string[]) => void; // 묶음 표식을 눌렀을 때 (그 지역 이름)
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

function PropertyMap({ properties, myAgencyId, selectedId, onSelect, onSelectGroup }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    // 지도는 한 번만 만들고 계속 쓴다.
    // 표식을 다시 그릴 때마다 지도를 새로 만들면 사용자가 옮겨 둔 위치와 확대 정도가 초기화된다.
    const mapRef = useRef<any>(null);

    // 지금 지도에 올려 둔 표식들. 다시 그리기 전에 이 목록을 지운다.
    const overlaysRef = useRef<any[]>([]);

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

        // 검색 결과가 바뀐 직후에만 범위를 맞춘다
        if (!bounds.isEmpty() && !fittedRef.current) {
            map.setBounds(bounds);
            fittedRef.current = true;
        }
    }, [properties, level, myAgencyId, selectedId, onSelect, onSelectGroup, sdkLoaded]);

    // 검색 조건이 바뀌어 목록이 통째로 달라지면 범위를 다시 맞춘다
    useEffect(() => {
        fittedRef.current = false;
    }, [properties]);

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
