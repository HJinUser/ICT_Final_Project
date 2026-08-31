/*
  동네 한줄평 목록과 작성 칸.

  행정동(adminCode) 하나에 붙는 부품이라, 어느 화면에 놓든 그 화면이 보고 있는
  행정동 정보를 그대로 넘겨 주면 된다. 법정동 Neighborhood.id 를 adminCode 자리에
  넣으면 엉뚱한 동네의 한줄평이 붙는다.

  한 사람은 같은 동네에 한 개만 남길 수 있고, 다시 쓰면 서버가 기존 글을 고친다.
  그래서 등록 버튼 문구가 "등록"이 아니라 상황에 따라 달라지지 않고 하나로 유지된다.
*/

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import axiosInstance from '../../api/axiosInstance';
import type { NeighborhoodReview } from '../../types/NeighborhoodReview';
import { MAX_REVIEW_LENGTH } from '../../types/NeighborhoodReview';
import '../../styles/NeighborhoodReviewSection.css';
import { getAccessToken } from '../../api/tokenStore';

interface Props {
    adminCode: string;
    adminName: string;
    districtName: string;

    // 설문으로 받아 둔 한줄평. 서비스가 열리기 전에 모은 것이라 작성자가 없고 고칠 수 없다.
    // 사용자가 쓴 한줄평과 섞으면 누가 쓴 글인지 알 수 없으므로 따로 묶어 보여 준다.
    surveyReviews?: string[];
}

// "2026-08-20T11:44:00" 같은 서버 시각을 "2026.08.20" 으로 줄인다.
function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function NeighborhoodReviewSection({
    adminCode,
    adminName,
    districtName,
    surveyReviews = [],
}: Props) {
    const navigate = useNavigate();

    const [reviews, setReviews] = useState<NeighborhoodReview[]>([]);
    const [content, setContent] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // 목록을 못 불러온 것과 저장에 실패한 것은 사용자가 할 일이 달라서 따로 둔다.
    const [listError, setListError] = useState('');
    const [formMessage, setFormMessage] = useState('');

    // 토큰이 있으면 작성 칸을, 없으면 로그인 안내를 보여 준다.
    // 토큰이 만료된 경우는 저장할 때 401 로 걸러진다.
    const loggedIn = Boolean(getAccessToken());

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setListError('');

            try {
                const response = await axiosInstance.get<NeighborhoodReview[]>('/neighborhood/reviews', {
                    params: { adminCode },
                });
                if (active) setReviews(response.data);
            } catch (requestError) {
                console.error('동네 한줄평 목록 조회 실패', requestError);
                if (active) {
                    setReviews([]);
                    setListError('한줄평을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [adminCode]);

    // 저장에 성공했을 때만 목록을 다시 읽는다. 실패하면 화면에 있던 목록을 그대로 둔다.
    const reload = async () => {
        try {
            const response = await axiosInstance.get<NeighborhoodReview[]>('/neighborhood/reviews', {
                params: { adminCode },
            });
            setReviews(response.data);
        } catch (requestError) {
            console.error('동네 한줄평 목록 갱신 실패', requestError);
            setListError('방금 남긴 한줄평을 목록에 반영하지 못했습니다. 새로고침해 주세요.');
        }
    };

    const save = async () => {
        if (!loggedIn) {
            setFormMessage('로그인 후 한줄평을 남길 수 있습니다.');
            navigate('/member/login');
            return;
        }

        const trimmed = content.trim();
        if (!trimmed) {
            setFormMessage('한줄평 내용을 입력해 주세요.');
            return;
        }

        setSaving(true);
        setFormMessage('');

        try {
            await axiosInstance.post('/neighborhood/reviews', {
                adminCode,
                adminName,
                districtName,
                content: trimmed,
            });
            setContent('');
            setFormMessage(`${adminName} 한줄평을 남겼습니다.`);
            await reload();
        } catch (requestError) {
            console.error('동네 한줄평 저장 실패', requestError);
            // 401 은 axiosInstance 가 재발급까지 시도한 뒤에도 실패한 경우다.
            setFormMessage('한줄평을 저장하지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="hoodrev">
            <div className="hoodrev-head">
                <h2 className="hoodrev-title">우리 동네 한줄평</h2>
                <span className="hoodrev-count">
                    {loading ? '불러오는 중' : `${reviews.length}개`}
                </span>
            </div>

            {loggedIn ? (
                <div className="hoodrev-form">
                    <div className="hoodrev-input">
                        <input
                            type="text"
                            maxLength={MAX_REVIEW_LENGTH}
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder={`${adminName}을(를) 한 문장으로 평가해 주세요.`}
                            disabled={saving}
                        />
                        <span className="hoodrev-length">
                            {content.length} / {MAX_REVIEW_LENGTH}
                        </span>
                    </div>
                    <button type="button" className="solid-btn" onClick={save} disabled={saving}>
                        {saving ? '등록 중' : '등록'}
                    </button>
                </div>
            ) : (
                <div className="hoodrev-guest">
                    <p>이 동네에 살아 본 이야기를 남기려면 로그인이 필요합니다.</p>
                    <button type="button" className="outline-btn" onClick={() => navigate('/member/login')}>
                        로그인하고 한줄평 남기기
                    </button>
                </div>
            )}

            {formMessage && <p className="hoodrev-message">{formMessage}</p>}

            {listError ? (
                <p className="hoodrev-error">{listError}</p>
            ) : (
                !loading && reviews.length === 0 && surveyReviews.length === 0 && (
                    <p className="hoodrev-empty">아직 남겨진 한줄평이 없습니다. 첫 번째로 남겨 보세요.</p>
                )
            )}

            {reviews.length > 0 && (
                <ul className="hoodrev-list">
                    {reviews.map((review) => (
                        <li key={review.id} className="hoodrev-item">
                            <div className="hoodrev-item-head">
                                <strong>{review.memberName}</strong>
                                <span>{formatDate(review.updatedAt)}</span>
                            </div>
                            <p>{review.content}</p>
                        </li>
                    ))}
                </ul>
            )}

            {surveyReviews.length > 0 && (
                <div className="hoodrev-survey">
                    <div className="hoodrev-survey-head">
                        <strong>설문으로 받은 이야기</strong>
                        <span>{surveyReviews.length}건</span>
                    </div>

                    <p className="hoodrev-survey-note">
                        서비스가 열리기 전에 모은 응답입니다. 동네 키워드 분석에도 함께 쓰였습니다.
                    </p>

                    <ul className="hoodrev-list">
                        {/* 설문 응답에는 식별자가 없다. 같은 문장이 두 번 들어올 수 있어 순번을 함께 키로 쓴다. */}
                        {surveyReviews.map((text, index) => (
                            <li key={`${index}-${text}`} className="hoodrev-item">
                                <p>{text}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default NeighborhoodReviewSection;
