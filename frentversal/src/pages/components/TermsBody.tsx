import type { TermsSection } from "../../types/Terms";

/*
  약관 본문(TermsDoc.sections)을 그리는 부분.

  회원가입 화면의 "펼쳐보기"와 약관 전문 화면(/terms)이 같은 내용을 보여줘야 해서
  그리는 코드를 여기 한 군데만 두고 양쪽에서 가져다 쓴다.
*/

type Props = {
    sections: TermsSection[];
};

function App({ sections }: Props) {
    return (
        <div className="terms-body">
            {sections.map((section, sectionIndex) => (
                <section key={section.heading ?? `section-${sectionIndex}`}>
                    {section.heading && <h4>{section.heading}</h4>}

                    {section.paragraphs?.map((text, textIndex) => (
                        // 조항 안의 항목("  1. ...")은 앞에 공백 두 칸을 붙여 두었다.
                        // 여기서 그 표시를 보고 한 단계 들여쓴다.
                        <p
                            key={`${sectionIndex}-${textIndex}`}
                            className={text.startsWith('  ') ? 'indent' : undefined}
                        >
                            {text.trimStart()}
                        </p>
                    ))}

                    {section.table && (
                        <div className="terms-table-scroll">
                            <table className="terms-table">
                                <thead>
                                    <tr>
                                        {section.table.head.map((cell) => (
                                            <th key={cell}>{cell}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.table.rows.map((row, rowIndex) => (
                                        <tr key={`row-${rowIndex}`}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
};

export default App;
