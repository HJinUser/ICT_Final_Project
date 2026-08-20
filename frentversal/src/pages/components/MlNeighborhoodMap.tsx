/*
  AI 동네 분석의 지도.

  행정동 경계를 선으로 두르고, 그 안의 매물을 지도 검색과 같은 가격 표식으로 찍는다.
  매물은 등록할 때 좌표로 판정해 둔 행정동 코드로 찾는다. 동 이름으로 찾으면
  매물에 붙은 dong 이 법정동이라 425개 중 338개가 한 건도 안 걸린다.

  매물 상세의 PropertyLocationMap 과는 목적이 다르다.
  그쪽은 매물 한 채의 주변을, 이쪽은 동네 하나의 범위와 그 안의 매물을 보여 준다.
*/

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { searchProperties } from '../../api/propertySearchApi';
import type { PropertySearchItem } from '../../types/PropertySearch';
import { loadKakaoSdk } from '../../utils/kakaoMap';
import '../../styles/MlNeighborhoodMap.css';

interface Props {
    adminCode: string;
    adminName: string;
    // [위도, 경도] 쌍의 목록. 비어 있으면 경계선을 그리지 않는다.
    boundary: [number, number][];
}

// 매물이 한 건도 없을 때 동네가 화면에 꽉 차도록 잡는 확대 정도
const FALLBACK_LEVEL = 5;

// 억/만원 단위로 짧게 줄인다. 표식 안에 들어가야 해서 길면 지도가 가려진다.
function shortPrice(item: PropertySearchItem): string {
    const value = item.price ?? 0;
    if (value <= 0) return '가격문의';

    const eok = Math.floor(value / 10_000);
    const rest = value % 10_000;

    if (eok === 0) return `${rest.toLocaleString()}만`;
    if (rest === 0) return `${eok}억`;
    return `${eok}.${Math.floor(rest / 1000)}억`;
}

function MlNeighborhoodMap({ adminCode, adminName, boundary }: Props) {
    const navigate = useNavigate();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const overlaysRef = useRef<any[]>([]);
    const polygonRef = useRef<any>(null);

    const [properties, setProperties] = useState<PropertySearchItem[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState('');
    const [listError, setListError] = useState('');

    // ── 지도 만들기 ────────────────────────────────────────
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

                    mapRef.current = new kakao.maps.Map(container, {
                        // 경계가 들어오면 아래 효과에서 그 범위로 다시 맞춘다.
                        // 여기 좌표는 경계가 없을 때만 남는 시작 위치다.
                        center: new kakao.maps.LatLng(37.5665, 126.978),
                        level: FALLBACK_LEVEL,
                    });

                    setMapReady(true);
                });
            })
            .catch((error: Error) => {
                if (!cancelled) setMapError(error.message);
            });

        return () => { cancelled = true; };
    }, []);

    // ── 이 동네 매물 가져오기 ──────────────────────────────
    useEffect(() => {
        let active = true;

        const load = async () => {
            setListError('');

            try {
                const data = await searchProperties({ adminCode });
                if (active) setProperties(data.content ?? []);
            } catch (requestError) {
                console.error('동네 매물 조회 실패', requestError);
                if (active) {
                    setProperties([]);
                    // 경계는 그대로 보이므로 안내만 남기고 화면을 막지 않는다.
                    setListError('이 동네의 매물을 불러오지 못했습니다.');
                }
            }
        };

        load();

        return () => { active = false; };
    }, [adminCode]);

    // ── 경계선 그리기 ──────────────────────────────────────
    useEffect(() => {
        const kakao = window.kakao;
        const map = mapRef.current;

        if (!kakao?.maps || !map) return;

        polygonRef.current?.setMap(null);
        polygonRef.current = null;

        if (boundary.length === 0) return;

        const path = boundary.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));

        const polygon = new kakao.maps.Polygon({
            map,
            path,
            strokeWeight: 2,
            strokeColor: '#4B0082',
            strokeOpacity: 0.9,
            fillColor: '#4B0082',
            fillOpacity: 0.07,
        });

        polygonRef.current = polygon;

        // 동네 전체가 화면에 들어오도록 맞춘다
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((point: any) => bounds.extend(point));
        map.setBounds(bounds);

        return () => {
            polygonRef.current?.setMap(null);
            polygonRef.current = null;
        };
    }, [boundary, mapReady]);

    // ── 매물 표식 그리기 ───────────────────────────────────
    useEffect(() => {
        const kakao = window.kakao;
        const map = mapRef.current;

        if (!kakao?.maps || !map) return;

        overlaysRef.current.forEach((overlay) => overlay.setMap(null));
        overlaysRef.current = [];

        properties.forEach((item) => {
            if (item.latitude == null || item.longitude == null) return;

            const element = document.createElement('button');
            element.type = 'button';
            element.className = 'mlmap-pin';
            element.textContent = shortPrice(item);
            element.title = item.name;
            element.addEventListener('click', () => navigate(`/property/${item.id}`));

            overlaysRef.current.push(new kakao.maps.CustomOverlay({
                map,
                position: new kakao.maps.LatLng(item.latitude, item.longitude),
                content: element,
                yAnchor: 1,
                zIndex: 5,
            }));
        });

        return () => {
            overlaysRef.current.forEach((overlay) => overlay.setMap(null));
            overlaysRef.current = [];
        };
    }, [properties, mapReady, navigate]);

    if (mapError) {
        return (
            <div className="mlmap">
                <p className="mlmap-error">지도를 불러오지 못했습니다. {mapError}</p>
            </div>
        );
    }

    return (
        <div className="mlmap">
            <div className="mlmap-head">
                <span className="mlmap-title">{adminName} 범위</span>
                <span className="mlmap-count">
                    {listError ? '매물 정보 없음' : `공개 매물 ${properties.length}건`}
                </span>
            </div>

            <div className="mlmap-canvas" ref={containerRef} />

            {listError && <p className="mlmap-error">{listError}</p>}

            {!listError && properties.length === 0 && (
                <p className="mlmap-note">
                    아직 이 동네에 등록된 공개 매물이 없습니다. 경계만 표시합니다.
                </p>
            )}
        </div>
    );
}

export default MlNeighborhoodMap;
