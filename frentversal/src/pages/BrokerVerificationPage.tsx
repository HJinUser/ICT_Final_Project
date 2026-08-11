import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyVerification, submitVerification } from '../api/brokerApi';
import type { BrokerVerification } from '../types/MyAgency';
import '../assets/common.css';
import '../assets/responsive.css';

// 중개인 인증 신청 화면
//
// 흐름 : 중개인이 등록번호·상호·소재지·대표자·등록일을 입력하고 자격증 사진을 올린다
//        -> 상태가 "심사 중"이 된다
//        -> 관리자가 디지털트윈국토에서 실제 사무소를 확인한 뒤 승인하면 "인증 완료"가 되고
//           중개사무소 화면에 인증 마크가 표시된다.

// 상태별 배지 색상 (common.css 의 .status.*)
const STATUS_COLORS: Record<string, string> = {
    UNVERIFIED: 'gray',
    PENDING: 'orange',
    VERIFIED: 'green',
};

function BrokerVerificationPage() {
    const [verification, setVerification] = useState<BrokerVerification | null>(null);
    const [loading, setLoading] = useState(true);

    // 입력값
    const [licenseNumber, setLicenseNumber] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [officeAddress, setOfficeAddress] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [registeredDate, setRegisteredDate] = useState('');
    const [licenseImage, setLicenseImage] = useState<File | null>(null);

    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    // 이전에 신청한 내용이 있으면 입력 칸을 채워 둔다 (반려 후 재신청할 때 편하도록)
    useEffect(() => {
        getMyVerification()
            .then((data) => {
                setVerification(data);
                setLicenseNumber(data.licenseNumber ?? '');
                setBusinessName(data.businessName ?? '');
                setOfficeAddress(data.officeAddress ?? '');
                setOwnerName(data.ownerName ?? '');
                setRegisteredDate(data.registeredDate ?? '');
            })
            .catch(() => setMessage('인증 정보를 불러오지 못했습니다.'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSending(true);
        setMessage('');

        try {
            const result = await submitVerification(
                { licenseNumber, businessName, officeAddress, ownerName, registeredDate },
                licenseImage,
            );

            setMessage(result);
            setVerification(await getMyVerification()); // 상태를 '심사 중'으로 갱신
        } catch (error: any) {
            setMessage(error.response?.data?.message ?? '인증 신청에 실패했습니다.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <main><section className="section"><div className="wrap"><p className="dim">불러오는 중입니다…</p></div></section></main>;
    }

    // 이미 인증이 끝났으면 다시 신청할 필요가 없다
    const alreadyVerified = verification?.verifyStatus === 'VERIFIED';

    return (
        <main>
            <section className="page-hero">
                <div className="wrap">
                    <div>
                        <div className="eyebrow">중개인 인증</div>
                        <h1>내 중개사무소 인증 받기</h1>
                        <p>공인중개사 자격과 사무소 정보를 관리자가 확인한 뒤 인증 마크를 발급합니다.</p>
                    </div>
                    <div className="hero-stat">
                        <span className="mono dim">현재 상태</span>
                        <strong>{verification?.verifyStatusLabel ?? '미인증'}</strong>
                        {verification?.submittedAt && (
                            <span className="xs dim">신청 {verification.submittedAt}</span>
                        )}
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="wrap" style={{ maxWidth: 760 }}>
                    {/* 반려된 경우 사유를 보여 준다 */}
                    {verification?.rejectReason && (
                        <div className="soft" style={{ marginBottom: 22 }}>
                            <strong>반려 사유</strong>
                            <p className="xs dim" style={{ marginTop: 5 }}>{verification.rejectReason}</p>
                        </div>
                    )}

                    {alreadyVerified ? (
                        <section className="card">
                            <span className={`status ${STATUS_COLORS.VERIFIED}`}>인증 완료</span>
                            <h2 style={{ marginTop: 12 }}>이미 인증이 완료된 중개사무소입니다.</h2>
                            <p className="muted" style={{ marginTop: 8 }}>
                                등록번호 {verification?.licenseNumber} · {verification?.businessName}
                            </p>
                            <Link className="solid-btn" to="/broker/agency" style={{ marginTop: 18, display: 'inline-block' }}>
                                내 중개사무소로 이동
                            </Link>
                        </section>
                    ) : (
                        <form className="card" onSubmit={handleSubmit}>
                            <div className="row between">
                                <h2>인증 정보 입력</h2>
                                <span className={`status ${STATUS_COLORS[verification?.verifyStatus ?? 'UNVERIFIED']}`}>
                                    {verification?.verifyStatusLabel ?? '미인증'}
                                </span>
                            </div>

                            <div className="field">
                                <label>등록번호</label>
                                <input
                                    placeholder="11650-2024-00123"
                                    value={licenseNumber}
                                    onChange={(event) => setLicenseNumber(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>상호</label>
                                <input
                                    placeholder="반포역전 공인중개사"
                                    value={businessName}
                                    onChange={(event) => setBusinessName(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>소재지</label>
                                <input
                                    placeholder="서울 서초구 신반포로 194"
                                    value={officeAddress}
                                    onChange={(event) => setOfficeAddress(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>대표자</label>
                                <input
                                    placeholder="박지훈"
                                    value={ownerName}
                                    onChange={(event) => setOwnerName(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>등록일</label>
                                <input
                                    type="date"
                                    value={registeredDate}
                                    onChange={(event) => setRegisteredDate(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>자격증 사진</label>
                                {/* 관리자가 입력값과 대조할 자료다. 이미 올린 사진이 있으면 다시 올리지 않아도 된다. */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => setLicenseImage(event.target.files?.[0] ?? null)}
                                />
                                {verification?.licenseImageUrl && !licenseImage && (
                                    <p className="xs dim">이미 제출한 사진이 있습니다. 바꾸려면 새 파일을 선택하세요.</p>
                                )}
                            </div>

                            {message && <p className="xs" style={{ marginTop: 14, color: 'var(--v)' }}>{message}</p>}

                            <button className="solid-btn" type="submit" style={{ width: '100%', marginTop: 18 }} disabled={sending}>
                                {sending ? '제출 중…' : verification?.verifyStatus === 'PENDING' ? '다시 제출하기' : '인증 신청하기'}
                            </button>

                            <p className="xs dim" style={{ marginTop: 12 }}>
                                제출한 정보는 관리자가 디지털트윈국토에서 사무소 실존 여부를 확인하는 데 사용됩니다.
                            </p>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

export default BrokerVerificationPage;
