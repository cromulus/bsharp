const NEXT_ARROW_FILL_CLASS = 'next-arrow-fill';
const NEXT_ARROW_FILL_DURATION_PROPERTY = '--next-arrow-fill-duration';

function getNextArrow(): HTMLElement | null {
    return document.querySelector('#next-chord > i.fa-arrow-right');
}

export function startNextArrowFill(durationMs: number): void {
    const arrow = getNextArrow();
    if (!arrow) return;

    const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;

    arrow.classList.remove(NEXT_ARROW_FILL_CLASS);
    arrow.style.removeProperty(NEXT_ARROW_FILL_DURATION_PROPERTY);

    // Force a reflow so repeated calls restart the CSS animation from zero.
    void arrow.offsetWidth;

    arrow.style.setProperty(NEXT_ARROW_FILL_DURATION_PROPERTY, `${duration}ms`);
    arrow.classList.add(NEXT_ARROW_FILL_CLASS);
}

export function resetNextArrowFill(): void {
    const arrow = getNextArrow();
    if (!arrow) return;

    arrow.classList.remove(NEXT_ARROW_FILL_CLASS);
    arrow.style.removeProperty(NEXT_ARROW_FILL_DURATION_PROPERTY);
}
