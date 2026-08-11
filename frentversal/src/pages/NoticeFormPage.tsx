import axios from 'axios';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createNotice, getNotice, updateNotice } from '../api/noticeApi';
import type { User } from '../types/User';
import '../assets/common.css';
import '../assets/responsive.css';
import '../components/Notice.css';

interface NoticeFormPageProps {
    user: User | null;
}

function getRequestErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | undefined;
        return data?.message || data?.error;
    }
    return undefined;
}

function NoticeFormPage({ user }: NoticeFormPageProps) {
    const { id } = useParams();
    const noticeId = id ? Number(id) : null;
    const editing = noticeId !== null;
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(editing);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadNotice = async () => {
            if (!editing || noticeId === null) return;
            if (!Number.isInteger(noticeId) || noticeId < 1) {
                setError('올바르지 않은 공지사항 번호입니다.');
                setLoading(false);
                return;
            }

            try {
                const notice = await getNotice(noticeId);
                if (active) {
                    setTitle(notice.title);
                    setContent(notice.content);
                }
            } catch (requestError) {
                console.error('수정할 공지사항 조회 실패', requestError);
                if (active) setError('수정할 공지사항을 불러오지 못했습니다.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadNotice();
        return () => { active = false; };
    }, [editing, noticeId]);

    if (user?.role !== 'ADMIN') {
        return (
            <main className="notice-detail-main">
                <section className="section">
                    <div className="wrap notice-wrap">
                        <div className="notice-state notice-error">공지사항 작성과 수정은 관리자만 가능합니다.</div>
                        <div className="notice-actions"><Link className="ghost-btn" to="/notice">목록으로</Link></div>
                    </div>
                </section>
            </main>
        );
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedTitle = title.trim();
        const normalizedContent = content.trim();

        if (!normalizedTitle || !normalizedContent) {
            setError('제목과 내용을 모두 입력해 주세요.');
            return;
        }
        if (normalizedTitle.length > 200) {
            setError('제목은 200자 이하로 입력해 주세요.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const savedNotice = editing && noticeId !== null
                ? await updateNotice(noticeId, { title: normalizedTitle, content: normalizedContent })
                : await createNotice({ title: normalizedTitle, content: normalizedContent });
            navigate(`/notice/${savedNotice.id}`, { replace: true });
        } catch (requestError) {
            console.error('공지사항 저장 실패', requestError);
            setError(getRequestErrorMessage(requestError) || '공지사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
            setSubmitting(false);
        }
    };

    return (
        <main className="notice-detail-main">
            <section className="section">
                <div className="wrap notice-form-wrap">
                    <div className="breadcrumb"><Link to="/notice">공지사항</Link> / {editing ? '수정' : '작성'}</div>
                    <div className="notice-form-head">
                        <div className="eyebrow">Admin</div>
                        <h1>공지사항 {editing ? '수정' : '작성'}</h1>
                        <p>사용자에게 전달할 서비스 소식과 주요 안내를 작성합니다.</p>
                    </div>

                    {loading ? (
                        <div className="notice-state">공지사항을 불러오는 중입니다.</div>
                    ) : (
                        <form className="notice-form" onSubmit={handleSubmit}>
                            <div className="field">
                                <label htmlFor="notice-title">제목</label>
                                <input
                                    id="notice-title"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    maxLength={200}
                                    required
                                    placeholder="공지사항 제목을 입력해 주세요"
                                />
                                <span className="notice-count">{title.length} / 200</span>
                            </div>
                            <div className="field">
                                <label htmlFor="notice-content">내용</label>
                                <textarea
                                    id="notice-content"
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    required
                                    placeholder="공지사항 내용을 입력해 주세요"
                                />
                            </div>
                            {error && <div className="notice-inline-error">{error}</div>}
                            <div className="notice-actions">
                                <Link className="ghost-btn" to={editing && noticeId ? `/notice/${noticeId}` : '/notice'}>취소</Link>
                                <button className="solid-btn" type="submit" disabled={submitting}>
                                    {submitting ? '저장 중' : editing ? '수정 완료' : '등록'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

export default NoticeFormPage;
