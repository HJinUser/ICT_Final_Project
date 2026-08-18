/*
  맞춤 추천 페이지.

  왼쪽에 취향 설정 패널, 오른쪽에 추천 매물 카드와 추천 동네를 놓는다.

  추천 카드는 세 장만 보여 준다. 첫 장은 사용자가 별표로 지정한 매물이 계속 차지하고,
  지정한 것이 없으면 점수가 가장 높은 매물이 그 자리를 대신한다.
  다른 추천 보기를 누르면 이미 본 매물 id 를 서버에 넘겨 나머지 두 장을 바꾼다.

  점수와 추천 이유는 서버가 만든 값을 그대로 보여 준다. 이 화면은 계산하지 않는다.
  나중에 추천 계산이 학습한 모델로 바뀌어도 이 화면은 고치지 않아도 된다.
*/

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import axiosInstance from '../api/axiosInstance';
import {
    clearBest as clearBestApi,
    getPreference,
    getRecommendations,
    savePreference,
    sendFeedback,
    setBest as setBestApi,
} from '../api/recommendationApi';
import { getNeighborhoodTags } from '../api/neighborhoodApi';
import NeighborhoodRecommendCard from './components/NeighborhoodRecommendCard';
import PreferenceSidebar from './components/PreferenceSidebar';
import RecommendCard from './components/RecommendCard';
import RecommendLockedPreview from './components/RecommendLockedPreview';
import type { Preference } from '../types/Preference';
import { EMPTY_PREFERENCE } from '../types/Preference';
import type {
    NeighborhoodRecommendationItem,
    RecommendationFeedbackType,
    RecommendationItem,
} from '../types/Recommendation';
import type { TagResponse } from '../types/Tag';
import type { User } from '../types/User';
import '../styles/RecommendPage.css';

// 이미 보여 준 매물 id 를 몇 개까지 기억할지.
// 무한정 쌓으면 볼 수 있는 매물이 계속 줄어들어 결국 추천이 비어 버린다.
const SHOWN_LIMIT = 30;

interface Props {
    user: User | null;
}

function RecommendPage({ user }: Props) {
    const navigate = useNavigate();

    const [preference, setPreference] = useState<Preference>(EMPTY_PREFERENCE);
    const [tags, setTags] = useState<TagResponse[]>([]);

    const [items, setItems] = useState<RecommendationItem[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRecommendationItem[]>([]);
    const [modelVersion, setModelVersion] = useState('');
    const [shownIds, setShownIds] = useState<number[]>([]);

    // 카드마다 이미 남긴 평가와 관심 등록 상태를 화면에서 기억해 둔다.
    // 서버에 다시 물어보지 않고도 버튼 모양을 바로 바꿔 주기 위해서다.
    const [feedbacks, setFeedbacks] = useState<Record<number, RecommendationFeedbackType>>({});
    const [favorites, setFavorites] = useState<Record<number, boolean>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyPropertyId, setBusyPropertyId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [preferenceError, setPreferenceError] = useState('');
    const [notice, setNotice] = useState('');

    /*
      추천 결과를 불러온다.

      refresh 가 참이면 이미 보여 준 매물 id 를 함께 보내서 다른 매물을 받는다.
      취향을 아직 저장하지 않은 회원이면 서버가 409 로 알려 주고, 그때는 초기설정 화면으로 보낸다.
    */
    const loadRecommendations = useCallback(async (refresh: boolean, shown: number[]) => {
        setError('');

        try {
            const data = await getRecommendations(refresh ? shown : []);

            setModelVersion(data.modelVersion);
            setItems(data.items);
            setNeighborhoods(data.neighborhoods);

            // 방금 받은 매물도 본 것으로 기록해 둔다.
            setShownIds((prev) => {
                const merged = new Set([...prev, ...data.items.map((item) => item.propertyId)]);
                return Array.from(merged).slice(-SHOWN_LIMIT);
            });
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                navigate('/preference-setup');
                return;
            }

            console.error('맞춤 추천을 불러오지 못했습니다.', err);
            setError('추천 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
    }, [navigate]);

    /*
      화면에 처음 들어왔을 때 취향, 태그, 추천을 함께 불러온다.

      비회원은 여기서 아무것도 부르지 않는다.
      추천과 취향 API 는 로그인한 사용자만 쓸 수 있어서 부르면 전부 401 로 막히고,
      화면에는 실패 안내만 남아 무엇이 잘못됐는지 오해하게 된다.
      비회원에게는 대신 잠금 안내 화면을 보여 준다.
    */
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);

            try {
                const saved = await getPreference();

                // saved 항목은 화면 상태로 쓰지 않으므로 취향 값만 떼어 낸다.
                const { saved: _ignored, ...values } = saved;
                setPreference(values);
            } catch (err) {
                console.error('취향 정보를 불러오지 못했습니다.', err);
                setPreferenceError('취향 정보를 불러오지 못했습니다. 저장은 계속 시도할 수 있습니다.');
            }

            try {
                setTags(await getNeighborhoodTags());
            } catch (err) {
                // 태그를 못 불러와도 나머지 취향 항목은 고칠 수 있으므로 화면 전체를 막지 않는다.
                console.error('태그 목록을 불러오지 못했습니다.', err);
            }

            await loadRecommendations(false, []);

            setLoading(false);
        };

        load();
    }, [user, navigate, loadRecommendations]);

    // 취향을 저장하고 그 기준으로 추천을 다시 받는다.
    const handleSavePreference = async () => {
        setSaving(true);
        setPreferenceError('');
        setNotice('');

        try {
            await savePreference(preference);

            // 취향이 바뀌었으므로 이미 본 매물 기록을 지우고 처음부터 다시 뽑는다.
            setShownIds([]);
            await loadRecommendations(false, []);

            setNotice('취향을 저장했습니다. 추천을 다시 계산했습니다.');
        } catch (err) {
            console.error('취향을 저장하지 못했습니다.', err);
            setPreferenceError('취향을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    // 다른 추천 보기. 이미 본 매물을 빼고 다시 받는다.
    const handleRefresh = async () => {
        setNotice('');
        setLoading(true);

        await loadRecommendations(true, shownIds);

        setLoading(false);
    };

    // 좋아요, 싫어요 평가를 보낸다.
    // 싫어요를 누른 매물은 추천에서 빠져야 하므로 목록을 다시 받는다.
    const handleFeedback = async (item: RecommendationItem, type: RecommendationFeedbackType) => {
        setBusyPropertyId(item.propertyId);
        setNotice('');

        try {
            await sendFeedback({
                propertyId: item.propertyId,
                type,
                recommendationScore: item.score,
                modelVersion,
            });

            setFeedbacks((prev) => ({ ...prev, [item.propertyId]: type }));

            if (type === 'DISLIKE') {
                await loadRecommendations(true, shownIds);
            }
        } catch (err) {
            console.error('평가를 저장하지 못했습니다.', err);
            setError('평가를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusyPropertyId(null);
        }
    };

    // 고른 매물을 내 BEST 로 지정한다. 이미 지정한 매물을 다시 누르면 해제한다.
    const handleSetBest = async (item: RecommendationItem) => {
        setBusyPropertyId(item.propertyId);
        setNotice('');

        try {
            if (item.userBest) {
                await clearBestApi();
            } else {
                await setBestApi(item.propertyId);
            }

            await loadRecommendations(false, []);
        } catch (err) {
            console.error('BEST 를 변경하지 못했습니다.', err);

            if (axios.isAxiosError(err) && err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('내 BEST 를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setBusyPropertyId(null);
        }
    };

    /*
      관심 매물 등록과 해제.

      누른 즉시 화면을 먼저 바꾸고 서버에 보낸다. 서버가 실패하면 원래대로 되돌린다.
      이렇게 하지 않으면 응답을 기다리는 동안 버튼이 반응하지 않는 것처럼 보인다.

      관심 매물은 이미 있는 기능이라 추천 전용 API 를 새로 만들지 않고 그대로 쓴다.
    */
    const handleToggleFavorite = async (propertyId: number) => {
        const previous = Boolean(favorites[propertyId]);

        setFavorites((prev) => ({ ...prev, [propertyId]: !previous }));

        try {
            const response = await axiosInstance.post<{ favorited: boolean }>(
                `/property/${propertyId}/favorite`,
            );

            setFavorites((prev) => ({ ...prev, [propertyId]: response.data.favorited }));
        } catch (err) {
            console.error('관심 매물을 변경하지 못했습니다.', err);

            // 실패했으므로 눌리기 전 상태로 되돌린다.
            setFavorites((prev) => ({ ...prev, [propertyId]: previous }));
            setError('관심 매물을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    // 비회원에게는 화면 구조만 흐리게 보여 주고 그 위에 로그인 안내를 얹는다.
    if (!user) {
        return (
            <main>
                <section className="page-hero">
                    <div className="wrap">
                        <div>
                            <div className="eyebrow">Recommend</div>
                            <h1>나를 위한 맞춤 추천</h1>
                            <p>취향, 관심 매물, 평가, 최근 검색을 함께 보고 골라 드립니다.</p>
                        </div>
                    </div>
                </section>

                <section className="section">
                    <div className="wrap">
                        <RecommendLockedPreview />
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main>
            <section className="page-hero">
                <div className="wrap rec-hero">
                    <div>
                        <div className="eyebrow">Recommend</div>
                        <h1>나를 위한 맞춤 추천</h1>
                        <p>취향, 관심 매물, 평가, 최근 검색을 함께 보고 골랐습니다.</p>
                    </div>

                    <button
                        type="button"
                        className="outline-btn rec-refresh"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        다른 추천 보기
                    </button>
                </div>
            </section>

            <section className="section">
                <div className="wrap rec-layout">
                    <PreferenceSidebar
                        preference={preference}
                        tags={tags}
                        saving={saving}
                        error={preferenceError}
                        onChange={setPreference}
                        onSave={handleSavePreference}
                    />

                    <div className="rec-main">
                        {notice && <div className="rec-alert success">{notice}</div>}
                        {error && <div className="rec-alert danger">{error}</div>}

                        {loading && items.length === 0 && <p className="muted">추천을 계산하는 중입니다...</p>}

                        {!loading && items.length === 0 && !error && (
                            <div className="rec-alert guide">
                                조건에 맞는 추천 매물이 아직 없습니다. 왼쪽에서 취향을 넓게 잡고 다시
                                저장해 보세요.
                            </div>
                        )}

                        <div className="rec-list">
                            {items.map((item, index) => (
                                <RecommendCard
                                    key={item.propertyId}
                                    item={item}
                                    wide={index === 0}
                                    feedback={feedbacks[item.propertyId] ?? null}
                                    busy={busyPropertyId === item.propertyId}
                                    favorited={Boolean(favorites[item.propertyId])}
                                    onLike={() => handleFeedback(item, 'LIKE')}
                                    onDislike={() => handleFeedback(item, 'DISLIKE')}
                                    onSetBest={() => handleSetBest(item)}
                                    onToggleFavorite={() => handleToggleFavorite(item.propertyId)}
                                />
                            ))}
                        </div>

                        {neighborhoods.length > 0 && (
                            <div className="rec-hoods">
                                <h2 className="rec-subtitle">추천 동네 TOP {neighborhoods.length}</h2>

                                <div className="rec-hoodlist">
                                    {neighborhoods.map((item, index) => (
                                        <NeighborhoodRecommendCard
                                            key={item.adminCode ?? `${item.districtName}-${item.adminName}`}
                                            item={item}
                                            rank={index + 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default RecommendPage;
