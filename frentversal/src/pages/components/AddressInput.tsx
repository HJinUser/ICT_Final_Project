import { useState } from 'react';

import { loadDaumPostcode, toSelectedAddress } from '../../utils/daumPostcode';
import type { SelectedAddress } from '../../utils/daumPostcode';

// 주소를 입력받는 공용 컴포넌트.
//
// 회원가입 · 중개사무소 · 매물 등 주소를 받는 모든 화면이 이걸 쓴다.
// 사용자는 검색해서 고르기만 하고 주소를 직접 타이핑하지 않는다.
// 그래서 "서울시 / 서울특별시 / 서울" 처럼 표기가 갈리는 일이 생기지 않는다.
//
// 상세주소(동·호수)만 자유 입력이다. 이건 검색에 쓰지 않으므로 표기가 달라도 상관없다.

interface Props {
    // 지금 저장되어 있는 전체 주소 (수정 화면에서 기존 값을 보여 줄 때 쓴다)
    value: string;

    // 주소를 고르거나 상세주소를 바꿨을 때 알려 준다.
    // detail 은 상세주소, selected 는 검색으로 고른 결과(상세주소만 바꾼 경우 null).
    onChange: (value: { address: string; detail: string; selected: SelectedAddress | null }) => void;

    detail?: string;      // 상세주소 (동·호수)
    label?: string;       // 라벨 문구. 화면마다 "주소" / "소재지" 등으로 다르다
    placeholder?: string;
    required?: boolean;

    // 상세주소 칸을 감출 때 쓴다. 회원 주소처럼 "시·구"까지만 받으면 되는 곳이 있다.
    withDetail?: boolean;
}

function AddressInput({
    value,
    onChange,
    detail = '',
    label = '주소',
    placeholder = '주소 검색 버튼을 눌러 주세요',
    required = false,
    withDetail = true,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const openSearch = async () => {
        setError('');
        setLoading(true);

        try {
            await loadDaumPostcode();

            new window.daum.Postcode({
                oncomplete: (data: unknown) => {
                    const selected = toSelectedAddress(data);

                    // 주소를 새로 고르면 상세주소는 비운다.
                    // 이전 건물의 동·호수가 남아 있으면 엉뚱한 주소가 된다.
                    onChange({ address: selected.address, detail: '', selected });
                },
            }).open();

        } catch (e) {
            setError(e instanceof Error ? e.message : '주소 검색을 열지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="field">
            <label>
                {label}{required && ' *'}
            </label>

            <div className="row" style={{ gap: 8 }}>
                {/* 직접 고친 주소가 섞이지 않도록 읽기 전용으로 둔다 */}
                <input
                    value={value}
                    placeholder={placeholder}
                    readOnly
                    onClick={openSearch}
                    style={{ flex: 1, cursor: 'pointer', background: 'var(--bg-2)' }}
                />
                <button type="button" className="outline-btn" onClick={openSearch} disabled={loading}>
                    {loading ? '여는 중…' : '주소 검색'}
                </button>
            </div>

            {withDetail && (
                <input
                    style={{ marginTop: 8 }}
                    placeholder="상세주소 (동·호수)"
                    value={detail}
                    onChange={(event) => onChange({ address: value, detail: event.target.value, selected: null })}
                    disabled={!value}
                />
            )}

            {error && <span className="msg" style={{ color: 'var(--red)' }}>{error}</span>}
        </div>
    );
}

export default AddressInput;
