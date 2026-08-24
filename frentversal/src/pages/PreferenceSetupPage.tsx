/*
  취향 초기 설정 화면.

  회원가입 뒤 처음 로그인한 일반 사용자가 반드시 한 번 거치는 화면이다.
  App.tsx 의 가드가 이 설정을 마치지 않은 사용자를 어느 주소로 가든 이 화면으로 되돌리고,
  이 화면에서는 상단 메뉴도 감춰서 빠져나갈 길을 두지 않는다.

  단계는 목업(onboarding.html)과 같은 세 단계다.

      1단계  키워드 선택   고른 키워드를 저장한다(PUT /recommendation/preferences)
      2단계  매물 평가     한 장씩 넘기며 평가한다(POST /recommendation/feedback)
      3단계  취향 분석     완료 처리한다(POST /recommendation/preference-complete)

  2단계에서 평가할 매물은 1단계를 저장한 뒤에 추천 API 로 받아 온다.
  키워드를 먼저 저장해야 그 키워드가 반영된 매물이 나오기 때문이다.

  완료 처리를 마지막 단계에 둔 이유가 있다.
  예전에는 취향을 저장하지 않아도 완료로 바꿀 수 있는 API 가 따로 있어서
  아무것도 고르지 않고 이 화면을 지나갈 수 있었다.
  지금은 두 단계를 모두 마쳐야만 완료 API 를 부르도록 화면이 순서를 잡는다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    completePreferenceSetup,
    getPreference,
    getRecommendations,
    savePreference,
    sendFeedback,
} from '../api/recommendationApi';
import { getNeighborhoodTags } from '../api/neighborhoodApi';
import { EMPTY_PREFERENCE } from '../types/Preference';
import type { RecommendationFeedbackType, RecommendationItem } from '../types/Recommendation';
import type { TagResponse } from '../types/Tag';
import { TAG_CATEGORY_LABELS, TAG_CATEGORY_ORDER } from '../types/Tag';
import '../styles/PreferenceSetupPage.css';

// 화면 위쪽 단계 표시에 쓸 이름
const STEPS = ['키워드 선택', '매물 평가', '취향 분석'];

// 1단계에서 최소한 몇 개는 골라야 다음으로 넘어갈 수 있는지.
// 하나도 고르지 않으면 추천할 기준이 없어서 어떤 매물을 보여 줘도 근거가 없다.
const MIN_KEYWORD_COUNT = 1;

interface Props {
    /*
      설정을 마쳤을 때 부모에게 알리는 함수.

      서버에서는 완료로 바뀌었어도 화면이 들고 있는 로그인 정보는 아직 미완료 상태다.
      이것을 함께 바꾸지 않으면 강제 진입 가드가 이 화면으로 다시 되돌려서,
      설정을 끝내고도 같은 화면을 반복해서 보게 된다.
    */
    onComplete: () => void;
}

function PreferenceSetupPage({ onComplete }: Props) {
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2 | 3>(1);

    const [tags, setTags] = useState<TagResponse[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

    const [samples, setSamples] = useState<RecommendationItem[]>([]);
    const [modelVersion, setModelVersion] = useState('');

    // 지금 몇 번째 매물을 보고 있는지. 평가를 누를 때마다 하나씩 넘어간다.
    const [sampleIndex, setSampleIndex] = useState(0);

    // 3단계에서 완료 처리가 끝났는지. 끝나기 전에는 스피너를 보여 준다.
    const [analyzed, setAnalyzed] = useState(false);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // 화면에 들어오면 태그 목록과 저장해 둔 취향을 불러온다.
    // 설정을 하다가 나갔다 온 사람은 고르던 키워드가 남아 있어야 처음부터 다시 하지 않는다.
    useEffect(() => {
        const load = async () => {
            try {
                setTags(await getNeighborhoodTags());
            } catch (err) {
                console.error('키워드 목록을 불러오지 못했습니다.', err);
                setError('키워드 목록을 불러오지 못했습니다. 화면을 새로고침해 주세요.');
            }

            try {
                const saved = await getPreference();
                setSelectedTagIds(saved.tagIds ?? []);
            } catch (err) {
                // 저장해 둔 값이 없어도 처음부터 고르면 되므로 화면을 막지 않는다.
                console.error('저장해 둔 취향을 불러오지 못했습니다.', err);
            }
        };

        load();
    }, []);

    // 키워드 하나를 골랐다가 다시 누르면 선택을 푼다.
    const toggleTag = (tagId: number) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
        );
    };

    /*
      1단계를 마친다.

      고른 키워드를 저장하고, 그 키워드가 반영된 매물을 받아 2단계로 넘어간다.
      저장과 조회 가운데 하나라도 실패하면 단계를 넘기지 않는다.
      평가할 매물 없이 2단계로 넘어가면 아무것도 못 하는 화면이 되기 때문이다.
    */
    const handleKeywordNext = async () => {
        if (selectedTagIds.length < MIN_KEYWORD_COUNT) {
            setError('키워드를 하나 이상 골라 주세요.');
            return;
        }

        setBusy(true);
        setError('');

        try {
            await savePreference({ ...EMPTY_PREFERENCE, tagIds: selectedTagIds });
        } catch (err) {
            console.error('키워드를 저장하지 못했습니다.', err);
            setError('키워드를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
            setBusy(false);
            return;
        }

        try {
            const data = await getRecommendations();

            if (data.items.length === 0) {
                setError('평가할 매물이 아직 없습니다. 키워드를 조금 더 넓게 골라 주세요.');
                setBusy(false);
                return;
            }

            setModelVersion(data.modelVersion);
            setSamples(data.items);
            setSampleIndex(0);
            setStep(2);
        } catch (err) {
            console.error('평가할 매물을 불러오지 못했습니다.', err);
            setError('평가할 매물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    /*
      2단계에서 매물 한 장을 평가한다.

      평가를 저장한 뒤 다음 장으로 넘기고, 마지막 장이면 3단계로 넘어간다.
      저장이 실패하면 넘기지 않는다. 넘겨 버리면 사용자는 평가한 줄 알지만 기록이 남지 않는다.
    */
    const handleVote = async (type: RecommendationFeedbackType) => {
        const item = samples[sampleIndex];

        if (!item) {
            return;
        }

        setBusy(true);
        setError('');

        try {
            await sendFeedback({
                propertyId: item.propertyId,
                type,
                recommendationScore: item.score,
                modelVersion,
            });

            const nextIndex = sampleIndex + 1;

            if (nextIndex >= samples.length) {
                setStep(3);
                await runAnalysis();
            } else {
                setSampleIndex(nextIndex);
            }
        } catch (err) {
            console.error('평가를 저장하지 못했습니다.', err);
            setError('평가를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    };

    /*
      3단계 완료 처리.

      화면에는 분석 중이라고 보여 주지만 실제로 하는 일은 완료 표시다.
      이 호출이 성공해야 다음 로그인부터 이 화면을 다시 보지 않는다.
      실패하면 완료 화면으로 넘어가지 않고 다시 시도할 수 있게 둔다.
    */
    const runAnalysis = async () => {
        setAnalyzed(false);

        try {
            await completePreferenceSetup();

            // 서버가 완료로 바꿨으니 화면이 들고 있는 로그인 정보도 함께 맞춘다.
            // 이 순서를 지켜야 완료 화면을 보여 준 뒤 맞춤 추천으로 나갈 수 있다.
            onComplete();
            setAnalyzed(true);
        } catch (err) {
            console.error('취향 설정을 마치지 못했습니다.', err);
            setError('설정을 마치지 못했습니다. 아래 버튼으로 다시 시도해 주세요.');
        }
    };

    // 설정을 마치고 맞춤 추천으로 넘어간다.
    const goToRecommend = () => {
        navigate('/recommend');
    };

    const currentSample = samples[sampleIndex];

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">Personalize</div>
                        <h1>취향 초기 설정</h1>
                        <p>
                            회원가입 이후 처음 한 번만 진행합니다. 
                            선택한 값은 맞춤 추천의 기본 기준이 되며 맞춤 추천 화면에서 언제든 바꿀 수 있습니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap">
                    {/* 단계 표시. 지나온 단계는 done, 지금 단계는 on 으로 표시한다. */}
                    <div className="stepper">
                        {STEPS.map((label, index) => {
                            const number = index + 1;
                            const state = number === step ? 'on' : number < step ? 'done' : '';

                            return (
                                <div className={`step ${state}`} key={label}>
                                    <i>{number}</i>
                                    <span>{label}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="onboarding-card">
                        {error && <div className="preference-alert danger">{error}</div>}

                        {step === 1 && (
                            <>
                                <div className="row between">
                                    <div>
                                        <h2>선호하는 키워드를 골라주세요</h2>
                                        <p className="muted" style={{ marginTop: 7 }}>
                                            여러 개를 선택할 수 있습니다. 선택한 키워드가 포함된 매물로
                                            중요도를 판단합니다.
                                        </p>
                                    </div>
                                    <span className="status purple">1 / 3</span>
                                </div>

                                {tags.length === 0 ? (
                                    <p className="muted" style={{ marginTop: 24 }}>
                                        고를 수 있는 키워드가 없습니다.
                                    </p>
                                ) : (
                                    TAG_CATEGORY_ORDER.map((category) => {
                                        const groupTags = tags.filter((tag) => tag.category === category);

                                        // 그 분류에 태그가 하나도 없으면 빈 제목만 남으므로 묶음을 그리지 않는다.
                                        if (groupTags.length === 0) {
                                            return null;
                                        }

                                        return (
                                            <div key={category}>
                                                <h4 style={{ marginTop: 24 }}>
                                                    {TAG_CATEGORY_LABELS[category]}
                                                </h4>
                                                <div className="chip-group" style={{ marginTop: 10 }}>
                                                    {groupTags.map((tag) => (
                                                        <button
                                                            type="button"
                                                            key={tag.id}
                                                            className={
                                                                selectedTagIds.includes(tag.id)
                                                                    ? 'filter-chip on'
                                                                    : 'filter-chip'
                                                            }
                                                            onClick={() => toggleTag(tag.id)}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                <div className="setup-foot">
                                    <span className="muted">{selectedTagIds.length}개 선택</span>
                                    <button
                                        type="button"
                                        className="solid-btn"
                                        onClick={handleKeywordNext}
                                        disabled={busy}
                                    >
                                        {busy ? '불러오는 중...' : '다음'}
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="row between">
                                    <div>
                                        <h2>이 집 어떠세요?</h2>
                                        <p className="muted" style={{ marginTop: 7 }}>
                                            좋아요 또는 싫어요를 누르면 다음 매물로 넘어갑니다.
                                        </p>
                                    </div>
                                    <span className="status purple">2 / 3</span>
                                </div>

                                {/* 몇 장 남았는지 알려 주는 점. 지금까지 본 장까지 채워진다. */}
                                <div className="setup-rateprog">
                                    {samples.map((item, index) => (
                                        <i
                                            key={item.propertyId}
                                            className={index <= sampleIndex ? 'on' : ''}
                                        />
                                    ))}
                                </div>

                                {currentSample && (
                                    <section className="card setup-ratecard">
                                        <div className="row gap24">
                                            <div
                                                className="thumb setup-thumb"
                                                style={
                                                    currentSample.property.thumbnailUrl
                                                        ? {
                                                            backgroundImage:
                                                                `url('${currentSample.property.thumbnailUrl}')`,
                                                        }
                                                        : undefined
                                                }
                                            />

                                            <div className="grow">
                                                <div className="row gap8">
                                                    <span className="status purple">
                                                        {currentSample.property.typeLabel}
                                                    </span>
                                                    {currentSample.property.areaLabel && (
                                                        <span className="tag">
                                                            {currentSample.property.areaLabel}
                                                        </span>
                                                    )}
                                                    {currentSample.property.floor != null && (
                                                        <span className="tag">
                                                            {currentSample.property.floor}층
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="setup-price">
                                                    {currentSample.property.priceLabel}
                                                </h3>
                                                <p className="muted" style={{ marginTop: 5 }}>
                                                    {currentSample.property.address}
                                                </p>

                                                {currentSample.property.keywords.length > 0 && (
                                                    <div className="tags" style={{ marginTop: 13 }}>
                                                        {currentSample.property.keywords.map((keyword) => (
                                                            <span className="tag" key={keyword}>
                                                                {keyword}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="setup-votes">
                                            <button
                                                type="button"
                                                className="outline-btn setup-vote"
                                                onClick={() => handleVote('LIKE')}
                                                disabled={busy}
                                            >
                                                좋아요
                                            </button>
                                            <button
                                                type="button"
                                                className="ghost-btn setup-vote"
                                                onClick={() => handleVote('DISLIKE')}
                                                disabled={busy}
                                            >
                                                싫어요
                                            </button>
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        {step === 3 && (
                            <div className="setup-analysis">
                                {!analyzed ? (
                                    <>
                                        <div className="setup-spinner" />
                                        <h2 style={{ marginTop: 24 }}>취향을 분석하고 있어요</h2>
                                        <p className="muted" style={{ marginTop: 8 }}>
                                            잠시만 기다려 주세요.
                                        </p>

                                        {/* 완료 처리가 실패했을 때만 다시 시도 버튼을 보여 준다. */}
                                        {error && (
                                            <button
                                                type="button"
                                                className="solid-btn"
                                                style={{ marginTop: 22 }}
                                                onClick={runAnalysis}
                                            >
                                                다시 시도
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div
                                            className="score-ring setup-ring"
                                            style={{ '--score': 100 } as React.CSSProperties}
                                        >
                                            <b>✓</b>
                                        </div>

                                        <h2 style={{ marginTop: 22 }}>
                                            회원님께 적절한 집을 성공적으로 선정했습니다
                                        </h2>
                                        <p className="muted" style={{ marginTop: 9 }}>
                                            초기에는 데이터가 적어 규칙 기반 가중치로 시작하고, <br />
                                            이용하면서 점점 정교해집니다.
                                        </p>

                                        <button
                                            type="button"
                                            className="solid-btn"
                                            style={{ marginTop: 26 }}
                                            onClick={goToRecommend}
                                        >
                                            맞춤 추천 보기
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default PreferenceSetupPage;
