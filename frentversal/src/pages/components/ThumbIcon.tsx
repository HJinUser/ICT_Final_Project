// 좋아요·싫어요 버튼에 쓰는 엄지 아이콘 (선 스타일).
//
// 이모지(👍👎) 대신 직접 그린 SVG 를 쓰는 이유:
//   - 이모지는 기기·브라우저마다 모양과 색이 달라 화면이 제각각으로 보인다.
//   - 색을 currentColor 로 두면 버튼 글자색을 그대로 따라가서,
//     보라 테두리 버튼과 회색 테두리 버튼에 각각 어울리고 호버 색도 함께 바뀐다.
//   - 외부 이미지가 아니라 저작권을 따질 일이 없다.
//
// 싫어요는 좋아요를 180도 돌려서 쓴다. 좌우까지 뒤집혀 손목이 반대쪽으로 가므로
// 따로 그린 것과 같은 모양이 되고, 두 아이콘의 굵기·비율이 어긋날 일이 없다.

interface Props {
    // true 면 싫어요(엄지 아래)
    down?: boolean;
    size?: number;
}

function ThumbIcon({ down = false, size = 17 }: Props) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            // 버튼에 "좋아요"라는 글자가 이미 있으므로 아이콘은 읽어 주지 않는다
            aria-hidden="true"
            focusable="false"
        >
            <g transform={down ? 'rotate(180 12 12)' : undefined}>
                {/* 손목 쪽 사각형 (그림에서 떨어져 있는 부분) */}
                <rect x="2.6" y="10.4" width="4.2" height="9.8" rx="1.3" />

                {/* 손바닥과 엄지 */}
                <path d="M7.6 10.9c1-.1 1.7-.7 2.1-1.6l2.3-5.5c.3-.7 1.1-1 1.8-.7.7.3 1.1 1 1 1.7l-.5 3.9c-.05.4.27.8.68.8h4.3c1.2 0 2.1 1.1 1.9 2.3l-1.1 6.6c-.16 1-1 1.7-2 1.7H9.6c-1.1 0-2-.9-2-2z" />
            </g>
        </svg>
    );
}

export default ThumbIcon;
