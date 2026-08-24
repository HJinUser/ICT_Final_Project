/*
  사진 크게 보기.

  매물 상세의 사진을 누르면 화면 전체에 띄우고, 좌우로 넘기거나 닫을 수 있다.
  마우스뿐 아니라 키보드로도 다룰 수 있어야 해서 ESC·←·→ 를 함께 받는다.

  열려 있는 동안에는 뒤쪽 화면이 스크롤되지 않게 막는다.
  큰 사진을 보다가 휠을 굴렸을 때 뒤에 있는 목록이 움직이면 닫은 뒤 위치를 잃기 때문이다.
*/

import { useCallback, useEffect } from 'react';

import '../../styles/PhotoLightbox.css';

export type LightboxPhoto = {
    id: number | string;
    url: string;
};

interface Props {
    photos: LightboxPhoto[];
    // 지금 보고 있는 사진의 순번. null 이면 닫힌 상태다.
    index: number | null;
    onClose: () => void;
    onChange: (nextIndex: number) => void;
}

function PhotoLightbox({ photos, index, onClose, onChange }: Props) {
    const opened = index !== null && index >= 0 && index < photos.length;

    // 사진이 한 장뿐이면 넘길 곳이 없으므로 끝에서 되돌아오게 하지 않는다.
    const move = useCallback((step: number) => {
        if (index === null || photos.length < 2) return;
        const next = (index + step + photos.length) % photos.length;
        onChange(next);
    }, [index, photos.length, onChange]);

    // 키보드로 닫고 넘기기
    useEffect(() => {
        if (!opened) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowLeft') move(-1);
            if (event.key === 'ArrowRight') move(1);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [opened, move, onClose]);

    // 열려 있는 동안 뒤쪽 화면 스크롤을 멈춘다. 닫을 때 원래 값으로 되돌린다.
    useEffect(() => {
        if (!opened) return;

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => { document.body.style.overflow = previous; };
    }, [opened]);

    if (!opened) return null;

    const photo = photos[index];

    return (
        <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="매물 사진 크게 보기"
            // 사진 바깥의 어두운 곳을 누르면 닫는다. 사진 자체를 눌렀을 때는 닫히지 않아야 한다.
            onClick={onClose}
        >
            <button
                type="button"
                className="lightbox-close"
                aria-label="닫기"
                onClick={onClose}
            >
                ×
            </button>

            {photos.length > 1 && (
                <button
                    type="button"
                    className="lightbox-nav prev"
                    aria-label="이전 사진"
                    onClick={(event) => { event.stopPropagation(); move(-1); }}
                >
                    ‹
                </button>
            )}

            <figure className="lightbox-stage" onClick={(event) => event.stopPropagation()}>
                <img src={photo.url} alt={`매물 사진 ${index + 1}`} />
                <figcaption>{index + 1} / {photos.length}</figcaption>
            </figure>

            {photos.length > 1 && (
                <button
                    type="button"
                    className="lightbox-nav next"
                    aria-label="다음 사진"
                    onClick={(event) => { event.stopPropagation(); move(1); }}
                >
                    ›
                </button>
            )}
        </div>
    );
}

export default PhotoLightbox;
