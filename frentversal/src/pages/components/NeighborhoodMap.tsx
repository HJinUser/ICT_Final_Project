import { useEffect, useRef, useState } from 'react';

import { findCenter, findDongBoundary, loadKakaoSdk } from '../../utils/kakaoMap';

// 동네 카드 위쪽에 들어가는 작은 지도.
//
// 예전에는 보라색 그라데이션 위에 동 이름 두 글자만 얹어 두었는데,
// 그것만으로는 그 동네가 서울 어디쯤인지 알 수 없어서 실제 지도를 보여 준다.
//
// 카드용이라 손대지 못하게 막아 둔다(드래그·확대 불가).
// 지도를 만지고 싶으면 카드를 눌러 상세 화면으로 가면 된다.

interface Props {
    // "서울시", "서초구", "반포동" — 이 셋을 합쳐 좌표를 찾는다
    city: string;
    district: string;
    dong: string;
}

// 동네 이름 -> 좌표. 한 번 찾은 동네는 다시 묻지 않는다.
// 목록을 넘길 때마다 같은 동네를 반복 조회하면 카카오 호출만 늘어난다.
const centerCache = new Map<string, { latitude: number; longitude: number } | null>();

// 카드 크기에 맞춘 확대 정도. 경계를 못 구했을 때만 쓰는 기본값이다.
const CARD_MAP_LEVEL = 6;

// 경계에 맞출 때 범위를 얼마나 좁혀 잡을지 (0.8 = 실제 경계의 80% 크기로 계산).
// 카카오는 확대 단계가 2배씩 뛰어서, 딱 맞추면 한 단계 덜 당겨진 채로 남아
// 동네가 카드 안에 작게 들어가는 경우가 많다. 범위를 조금 좁혀 두면
// 아슬아슬하게 걸려 있던 카드가 한 단계 더 당겨진다. 넉넉한 카드는 그대로다.
const FIT_TIGHTEN = 0.9;

// 경계선 범위에 맞춰 지도 화면을 잡는다.
function fitTightly(map: any, bounds: any) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const latPad = (ne.getLat() - sw.getLat()) * (1 - FIT_TIGHTEN) / 2;
    const lngPad = (ne.getLng() - sw.getLng()) * (1 - FIT_TIGHTEN) / 2;

    const kakao = window.kakao;
    const tightened = new kakao.maps.LatLngBounds(
        new kakao.maps.LatLng(sw.getLat() + latPad, sw.getLng() + lngPad),
        new kakao.maps.LatLng(ne.getLat() - latPad, ne.getLng() - lngPad),
    );

    // 여백까지 0 으로 둬야 계산한 만큼 실제로 당겨진다
    map.setBounds(tightened, 0, 0);
}

function NeighborhoodMap({ city, district, dong }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const address = `${city} ${district} ${dong}`;

        const draw = async () => {
            try {
                await loadKakaoSdk();
            } catch {
                if (!cancelled) setFailed(true); // 지도 키가 없는 환경
                return;
            }

            const kakao = window.kakao;
            if (cancelled || !kakao?.maps) return;

            kakao.maps.load(async () => {
                if (cancelled) return;

                // 경계가 있으면 그것으로 화면을 맞추므로 좌표를 따로 물어볼 필요가 없다.
                const boundary = findDongBoundary(district, dong);

                const center = boundary
                    ? null
                    : centerCache.has(address) ? centerCache.get(address)! : await findCenter(address);

                if (!boundary) centerCache.set(address, center);

                if (cancelled || !containerRef.current) return;

                // 경계도 좌표도 못 구하면 지도를 그리지 않고 예전 모양(동 이름)으로 돌아간다
                if (!boundary && !center) {
                    setFailed(true);
                    return;
                }

                const map = new kakao.maps.Map(containerRef.current, {
                    center: center
                        ? new kakao.maps.LatLng(center.latitude, center.longitude)
                        : new kakao.maps.LatLng(37.5665, 126.9780), // 경계에 맞추기 전 임시 위치
                    level: CARD_MAP_LEVEL,
                    draggable: false,
                    zoomable: false,
                    disableDoubleClickZoom: true,
                });

                // 카드 안에서는 확대·이동을 막는다. 클릭은 카드 링크가 받아야 한다.
                map.setZoomable(false);
                map.setDraggable(false);

                if (!boundary) return;

                // 동네 경계선을 얹고 그 범위에 맞춰 화면을 잡는다.
                // 하위 동을 합쳐 둔 동네는 조각이 여러 개라 하나씩 그린다.
                const bounds = new kakao.maps.LatLngBounds();

                boundary.coordinates.forEach((ring) => {
                    const path = ring.map(([longitude, latitude]) => {
                        const position = new kakao.maps.LatLng(latitude, longitude);
                        bounds.extend(position);
                        return position;
                    });

                    // 지도 검색 화면의 구 경계선과 같은 색으로 맞춘다
                    new kakao.maps.Polygon({
                        map,
                        path,
                        strokeWeight: 2,
                        strokeColor: '#4B0082',
                        strokeOpacity: 0.9,
                        fillColor: '#4B0082',
                        fillOpacity: 0.08,
                    });
                });

                fitTightly(map, bounds);
            });
        };

        draw();

        return () => { cancelled = true; };
    }, [city, district, dong]);

    // 지도를 못 그리면 원래 쓰던 표시로 돌아간다 (키가 없거나 주소를 못 찾은 경우)
    if (failed) return <strong>{dong.slice(0, 2)}</strong>;

    return <div className="neighborhood-map" ref={containerRef} />;
}

export default NeighborhoodMap;
