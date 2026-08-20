/*
  별점 입력.

  마우스를 올리면 그 자리까지 미리 채워 보여 주고, 누르면 확정하고,
  벗어나면 확정된 점수로 되돌아온다.

  화면낭독기와 키보드로도 고를 수 있어야 해서 라디오 버튼 묶음으로 만들었다.
  별 모양은 글자(★)로 그린다. 이미지를 쓰면 색을 바꿀 때마다 파일을 다시 만들어야 한다.
*/

import { useState } from 'react';

import '../../styles/StarRatingInput.css';

interface Props {
    value: number;
    onChange: (next: number) => void;
    // 몇 점 만점인지. 기본 5점.
    max?: number;
    // 점수 옆에 "4점" 같은 글자를 함께 보여 줄지
    showLabel?: boolean;
    disabled?: boolean;
}

function StarRatingInput({ value, onChange, max = 5, showLabel = true, disabled = false }: Props) {
    // 마우스가 올라가 있는 별의 점수. 0이면 올라가 있지 않은 상태다.
    const [hovered, setHovered] = useState(0);

    // 마우스를 올린 동안에는 그 점수를, 벗어나면 확정된 점수를 칠한다.
    const shown = hovered || value;

    const stars = Array.from({ length: max }, (_, index) => index + 1);

    return (
        <div className="starinput">
            <div
                className="starinput-stars"
                role="radiogroup"
                aria-label={`별점 ${max}점 만점`}
                // 별 하나하나가 아니라 묶음에서 한 번만 되돌린다.
                // 별 사이를 지나갈 때마다 초기화되면 채워진 별이 깜빡인다.
                onMouseLeave={() => setHovered(0)}
            >
                {stars.map((score) => (
                    <button
                        key={score}
                        type="button"
                        role="radio"
                        aria-checked={value === score}
                        aria-label={`${score}점`}
                        className={`starinput-star${score <= shown ? ' on' : ''}`}
                        disabled={disabled}
                        onMouseEnter={() => !disabled && setHovered(score)}
                        onFocus={() => !disabled && setHovered(score)}
                        onBlur={() => setHovered(0)}
                        onClick={() => !disabled && onChange(score)}
                    >
                        ★
                    </button>
                ))}
            </div>

            {showLabel && (
                <span className="starinput-label">
                    {/* 아직 아무것도 안 고른 상태와 고른 상태를 구분해서 알려 준다 */}
                    {shown > 0 ? `${shown}점` : '별점을 선택해 주세요'}
                </span>
            )}
        </div>
    );
}

export default StarRatingInput;
