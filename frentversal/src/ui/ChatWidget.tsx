import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { sendChatMessage } from '../api/chatApi';
import type { ChatPropertyCard, ChatTurn } from '../types/Chat';
import type { User } from '../types/User';
import '../styles/ChatWidget.css';

/*
  화면 오른쪽 아래에 항상 떠 있는 AI 챗봇.

  App.tsx 가 헤더·푸터와 같은 자리에서 이 부품을 불러서, 어느 화면을 열어도 함께 뜬다.
  누르면 버튼 위로 작은 대화창이 열리고, 뒤 화면은 그대로 보인다.
  매물을 보면서 동시에 물어볼 수 있게 하려고 전체 화면 대신 이 모양을 골랐다.

  대화는 서버에 저장하지 않는다. 이 부품이 들고 있다가 매 요청마다 통째로 보내고,
  창을 닫거나 새로 고치면 사라진다.
*/

// 매물 상세 화면의 주소에서 매물 번호를 꺼낸다.
//
// /property/form 과 /property/compare 도 같은 모양이라 숫자일 때만 인정한다.
// 잘못 뽑으면 챗봇이 엉뚱한 매물을 "이 매물"로 알아듣는다.
function toPropertyId(pathname: string): number | undefined {
    const matched = pathname.match(/^\/property\/(\d+)$/);

    return matched ? Number(matched[1]) : undefined;
}

// 대화창을 처음 열었을 때 보여 주는 안내.
// 무엇을 물어볼 수 있는지 모르면 아무 말도 못 하고 닫게 된다.
const GREETING = '무엇을 찾아 드릴까요? 지역과 예산을 알려 주시면 매물을 찾아 드립니다.';

const EXAMPLES = [
    '서초구 전세 5억 이하 매물 찾아줘',
    '방 2개 이상 아파트 보여줘',
];

type ChatWidgetProps = {
    user: User | null;
};

function ChatWidget({ user }: ChatWidgetProps) {
    const [open, setOpen] = useState(false);
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    // 새 답변이 오면 대화 목록의 맨 아래로 내린다.
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const list = listRef.current;

        if (!list) {
            return;
        }

        list.scrollTop = list.scrollHeight;
    }, [turns, loading]);

    /*
      버튼을 눌렀을 때.

      로그인해야 쓸 수 있는 기능이라 비로그인 사용자는 로그인 화면으로 보낸다.
      버튼 자체를 감추지 않는 것은, 이런 기능이 있다는 것을 알려 주기 위해서다.
    */
    const handleToggle = () => {
        if (!user) {
            navigate('/member/login');
            return;
        }

        setOpen((previous) => !previous);
    };

    // 매물 카드를 누르면 그 매물 상세로 간다. 대화창은 닫아서 화면을 가리지 않게 한다.
    const handleCardClick = (card: ChatPropertyCard) => {
        setOpen(false);
        navigate(`/property/${card.id}`);
    };

    const handleExampleClick = (example: string) => {
        setInput(example);
    };

    // 질문을 보내고 답변을 받아 대화에 붙인다.
    const handleSend = async () => {
        const question = input.trim();

        // 빈 입력이나 답변을 기다리는 중에는 다시 보내지 않는다.
        if (!question || loading) {
            return;
        }

        const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: question }];

        setTurns(nextTurns);
        setInput('');
        setError(null);
        setLoading(true);

        try {
            const response = await sendChatMessage({
                // 서버에는 화면 전용 값(매물 카드)을 빼고 대화만 보낸다.
                messages: nextTurns.map((turn) => ({ role: turn.role, content: turn.content })),
                pageContext: {
                    path: location.pathname,
                    propertyId: toPropertyId(location.pathname),
                },
            });

            setTurns([
                ...nextTurns,
                {
                    role: 'assistant',
                    content: response.reply,
                    properties: response.properties,
                },
            ]);
        } catch (caught) {
            /*
              실패했을 때 사용자가 쓴 질문은 지우지 않고 그대로 둔다.
              대화가 통째로 사라지면 무엇을 물었는지도 알 수 없어 다시 쓰기 번거롭다.
            */
            console.error('챗봇 응답을 받지 못했습니다.', caught);
            setError('답변을 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    // Enter 로 보내고, Shift+Enter 는 줄바꿈으로 남겨 둔다.
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    };

    return (
        <>
            {open && (
                <div className="chatbot-panel" role="dialog" aria-label="AI 상담">
                    <div className="chatbot-head">
                        <div>
                            <strong>AI 도우미</strong>
                            <span className="chatbot-head-sub">매물을 찾아 드립니다</span>
                        </div>
                        <button
                            type="button"
                            className="chatbot-close"
                            onClick={() => setOpen(false)}
                            aria-label="닫기"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                        </button>
                    </div>

                    <div className="chatbot-body" ref={listRef}>
                        {turns.length === 0 && (
                            <div className="chatbot-empty">
                                <p>{GREETING}</p>
                                <div className="chatbot-examples">
                                    {EXAMPLES.map((example) => (
                                        <button
                                            type="button"
                                            key={example}
                                            className="chatbot-example"
                                            onClick={() => handleExampleClick(example)}
                                        >
                                            {example}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {turns.map((turn, index) => (
                            <div className={`chatbot-turn ${turn.role}`} key={`${turn.role}-${index}`}>
                                <div className="chatbot-bubble">{turn.content}</div>

                                {turn.properties && turn.properties.length > 0 && (
                                    <div className="chatbot-cards">
                                        {turn.properties.map((card) => (
                                            <button
                                                type="button"
                                                className="chatbot-card"
                                                key={card.id}
                                                onClick={() => handleCardClick(card)}
                                            >
                                                {card.thumbnailUrl ? (
                                                    <img src={card.thumbnailUrl} alt="" className="chatbot-card-img" />
                                                ) : (
                                                    <span className="chatbot-card-img chatbot-card-noimg" />
                                                )}
                                                <span className="chatbot-card-text">
                                                    <span className="chatbot-card-price">
                                                        {card.priceLabel ?? card.name ?? `매물 ${card.id}`}
                                                    </span>
                                                    <span className="chatbot-card-sub">
                                                        {[card.typeLabel, card.areaLabel, card.address]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="chatbot-turn assistant">
                                <div className="chatbot-bubble chatbot-thinking">생각 중입니다...</div>
                            </div>
                        )}

                        {error && <p className="chatbot-error">{error}</p>}
                    </div>

                    <div className="chatbot-foot">
                        <textarea
                            className="chatbot-input"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="어떤 집을 찾으세요?"
                            rows={1}
                        />
                        <button
                            type="button"
                            className="chatbot-send"
                            onClick={() => void handleSend()}
                            disabled={loading || input.trim().length === 0}
                            aria-label="보내기"
                        >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M5 12h13M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <button
                type="button"
                className={`chatbot-fab ${open ? 'is-open' : ''}`}
                onClick={handleToggle}
                aria-label={open ? 'AI 상담 닫기' : 'AI 상담 열기'}
            >
                AI
            </button>
        </>
    );
}

export default ChatWidget;
