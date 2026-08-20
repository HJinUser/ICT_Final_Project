/*
  매물 상세의 위치 지도.

  가운데에 이 매물을 크게 찍고, 반경 안의 지하철·버스·병원·편의점을 그보다 작은 점으로 찍는다.
  주변시설 좌표는 파이썬(FastAPI)이 준다. AI 시세예측이 참고한 것과 같은 데이터라,
  화면에 보이는 개수와 예측이 센 개수가 어긋나지 않는다.

  지도 검색의 PropertyMap 과는 목적이 달라 따로 만들었다.
  그쪽은 매물 여러 건을 확대 정도에 따라 묶어 보여 주고, 이쪽은 한 건의 주변을 보여 준다.
*/

import { useEffect, useRef, useState } from 'react';

import { getNearbyPlaces } from '../../api/nearbyPlaceApi';
import type {
    NearbyPlace,
    NearbyPlaceCategory,
    NearbyPlaceResponse,
} from '../../types/NearbyPlace';
import { NEARBY_CATEGORY_META, NEARBY_CATEGORY_ORDER } from '../../types/NearbyPlace';
import { loadKakaoSdk } from '../../utils/kakaoMap';
import '../../styles/PropertyLocationMap.css';

interface Props {
    propertyId: number;
    latitude: number;
    longitude: number;
    propertyName: string;
}

// 처음 보여 줄 확대 정도. 숫자가 작을수록 확대다.
// 반경 500m~1km 안의 시설이 한 화면에 들어오는 수준으로 잡았다.
const INITIAL_LEVEL = 5;

// 매물 자리에 세울 표식. 주변시설보다 확실히 커야 해서 이름표까지 붙인다.
function createPropertyMarker(name: string): HTMLElement {
    const element = document.createElement('div');
    element.className = 'plmap-home';
    element.innerHTML = `<span class="plmap-home-dot"></span><span class="plmap-home-label"></span>`;
    // 매물 이름은 사용자가 입력한 값이라 innerHTML 로 넣지 않는다.
    element.querySelector('.plmap-home-label')!.textContent = name;
    return element;
}

// 주변시설 자리에 찍을 작은 점. 종류마다 색이 다르고 마우스를 올리면 이름과 거리가 보인다.
function createPlaceMarker(place: NearbyPlace, category: NearbyPlaceCategory): HTMLElement {
    const meta = NEARBY_CATEGORY_META[category];

    const element = document.createElement('div');
    element.className = 'plmap-poi';
    element.style.background = meta.color;
    element.title = `${meta.label} · ${place.name} · ${Math.round(place.distanceM)}m`;
    return element;
}

function PropertyLocationMap({ propertyId, latitude, longitude, propertyName }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);

    // 종류별로 만들어 둔 표식. 칩을 껐다 켤 때 다시 만들지 않고 지도에서 올렸다 내리기만 한다.
    const overlaysRef = useRef<Partial<Record<NearbyPlaceCategory, any[]>>>({});

    const [places, setPlaces] = useState<NearbyPlaceResponse>({});
    const [visible, setVisible] = useState<Record<NearbyPlaceCategory, boolean>>({
        station: true,
        bus: true,
        hospital: true,
        convenience: true,
    });

    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState('');
    const [placesError, setPlacesError] = useState('');

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

                    const center = new kakao.maps.LatLng(latitude, longitude);

                    const map = new kakao.maps.Map(container, { center, level: INITIAL_LEVEL });
                    mapRef.current = map;

                    // 매물 표식은 항상 떠 있어야 하므로 칩과 무관하게 여기서 한 번만 올린다.
                    new kakao.maps.CustomOverlay({
                        map,
                        position: center,
                        content: createPropertyMarker(propertyName),
                        yAnchor: 1,
                        zIndex: 10,
                    });

                    setMapReady(true);
                });
            })
            .catch((error: Error) => {
                if (!cancelled) setMapError(error.message);
            });

        return () => { cancelled = true; };
        // 매물이 바뀌면 상세 화면 자체가 다시 그려지므로 좌표는 의존값으로 두지 않는다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 주변시설 가져오기 ──────────────────────────────────
    useEffect(() => {
        let active = true;

        const load = async () => {
            setPlacesError('');

            try {
                const data = await getNearbyPlaces(propertyId);
                if (active) setPlaces(data ?? {});
            } catch (requestError) {
                console.error('주변시설 조회 실패', requestError);
                if (active) {
                    setPlaces({});
                    // 지도와 매물 위치는 그대로 보이므로 안내만 남기고 화면을 막지 않는다.
                    setPlacesError('주변시설을 불러오지 못했습니다. 위치만 표시합니다.');
                }
            }
        };

        load();

        return () => { active = false; };
    }, [propertyId]);

    // ── 주변시설 표식 만들기 ───────────────────────────────
    useEffect(() => {
        const kakao = window.kakao;
        const map = mapRef.current;

        if (!kakao?.maps || !map) return;

        // 이전에 올려 둔 표식을 모두 걷어낸다
        Object.values(overlaysRef.current).forEach((list) => {
            list?.forEach((overlay) => overlay.setMap(null));
        });
        overlaysRef.current = {};

        NEARBY_CATEGORY_ORDER.forEach((category) => {
            const list = places[category] ?? [];

            overlaysRef.current[category] = list.map((place) => new kakao.maps.CustomOverlay({
                map: visible[category] ? map : null,
                position: new kakao.maps.LatLng(place.latitude, place.longitude),
                content: createPlaceMarker(place, category),
                yAnchor: 0.5,
                zIndex: 1,
            }));
        });

        return () => {
            Object.values(overlaysRef.current).forEach((list) => {
                list?.forEach((overlay) => overlay.setMap(null));
            });
            overlaysRef.current = {};
        };
        // visible 은 아래 효과에서 따로 처리한다. 여기서 함께 보면 칩을 누를 때마다 표식을 다시 만든다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [places, mapReady]);

    // ── 칩으로 켜고 끄기 ───────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        NEARBY_CATEGORY_ORDER.forEach((category) => {
            overlaysRef.current[category]?.forEach((overlay) => {
                overlay.setMap(visible[category] ? map : null);
            });
        });
    }, [visible, places, mapReady]);

    const toggle = (category: NearbyPlaceCategory) => {
        setVisible((prev) => ({ ...prev, [category]: !prev[category] }));
    };

    if (mapError) {
        return (
            <section className="card plmap-card">
                <div className="section-head"><h2>위치</h2></div>
                <p className="plmap-error">지도를 불러오지 못했습니다. {mapError}</p>
            </section>
        );
    }

    return (
        <section className="card plmap-card">
            <div className="section-head">
                <h2>위치와 주변시설</h2>
            </div>

            <div className="plmap-chips">
                {NEARBY_CATEGORY_ORDER.map((category) => {
                    const meta = NEARBY_CATEGORY_META[category];
                    const count = places[category]?.length ?? 0;

                    return (
                        <button
                            key={category}
                            type="button"
                            className={`plmap-chip${visible[category] ? ' on' : ''}`}
                            onClick={() => toggle(category)}
                            aria-pressed={visible[category]}
                        >
                            <span className="plmap-swatch" style={{ background: meta.color }} />
                            {meta.label} {count}
                        </button>
                    );
                })}
            </div>

            <div className="plmap-canvas" ref={containerRef} />

            <p className="plmap-note">
                지하철역·병원은 반경 1km, 버스정류소·편의점은 반경 500m 안을 보여 줍니다.
                AI 시세예측이 참고한 것과 같은 기준입니다.
            </p>

            {placesError && <p className="plmap-error">{placesError}</p>}
        </section>
    );
}

export default PropertyLocationMap;
