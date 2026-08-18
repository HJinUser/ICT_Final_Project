import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    BlockQuote,
    Bold,
    ClassicEditor,
    Essentials,
    Heading,
    Italic,
    Link,
    List,
    Paragraph,
    Underline,
} from 'ckeditor5';
import koreanTranslations from 'ckeditor5/translations/ko.js';
import 'ckeditor5/ckeditor5.css';

interface NoticeEditorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

// CKEditor 5 v44 이상은 licenseKey가 필수다.
// 상용 키가 있으면 VITE_CKEDITOR_LICENSE_KEY에 넣고, GPL 프로젝트에서는 GPL 값을 사용한다.
const licenseKey = import.meta.env.VITE_CKEDITOR_LICENSE_KEY?.trim() || 'GPL';

const editorConfig = {
    licenseKey,
    plugins: [
        Essentials,
        Paragraph,
        Heading,
        Bold,
        Italic,
        Underline,
        Link,
        List,
        BlockQuote,
    ],
    toolbar: {
        items: [
            'undo',
            'redo',
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'link',
            'bulletedList',
            'numberedList',
            'blockQuote',
        ],
        shouldNotGroupWhenFull: true,
    },
    language: 'ko',
    translations: [koreanTranslations],
    placeholder: '공지사항 내용을 입력해 주세요',
    link: {
        addTargetToExternalLinks: true,
        defaultProtocol: 'https://',
    },
};

function NoticeEditor({ value, onChange, disabled = false }: NoticeEditorProps) {
    return (
        <div className="notice-editor">
            <CKEditor
                editor={ClassicEditor}
                config={editorConfig}
                data={value}
                disabled={disabled}
                onChange={(_, editor) => onChange(editor.getData())}
            />
        </div>
    );
}

export default NoticeEditor;
