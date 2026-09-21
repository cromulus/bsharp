import { getCurrentProfile, getCurrentTargetNumber } from './state';

export type ChildStage = 'ready' | 'loading' | 'choose' | 'correction' | 'feedback' | 'complete' | 'explore';
let stage: ChildStage = 'ready';
export function getChildStage(): ChildStage { return stage; }

const messages: Record<ChildStage, string> = {
    ready: 'Tap to listen', loading: 'Listen…', choose: 'Which color?',
    correction: 'Listen to this one', feedback: 'Here we go!',
    complete: 'All done for now', explore: 'Try the sounds',
};

export function setChildStage(next: ChildStage): void {
    stage = next;
    document.body.dataset.stage = next;
    document.body.classList.toggle('gentle-hints', getCurrentProfile().enable_onboarding_hints);
    const label = document.getElementById('child-prompt');
    if (label) label.textContent = messages[next];
    const play = document.getElementById('play-button') as HTMLButtonElement;
    const advance = document.getElementById('next-chord') as HTMLButtonElement;
    if (play) play.disabled = next === 'complete' || next === 'explore';
    if (advance) {
        advance.disabled = next !== 'feedback';
        advance.classList.toggle('deactivated', advance.disabled);
        const last = getCurrentProfile().stats.identifications >= getCurrentTargetNumber();
        advance.setAttribute('aria-label', last ? 'Finish practice' : 'Next sound');
        advance.classList.toggle('last-sound', last);
    }
    const explore = document.getElementById('explore-button');
    if (explore) {
        explore.setAttribute('aria-pressed', String(next === 'explore'));
        explore.setAttribute('aria-label', next === 'explore' ? 'Return to practice' : 'Explore sounds without scoring');
        explore.querySelector('i')!.className = next === 'explore' ? 'fa fa-play' : 'fa fa-music';
        explore.querySelector('span')!.textContent = next === 'explore' ? 'Play a round' : 'Try the sounds';
    }
    document.querySelectorAll<HTMLElement>('#flag-holder .flag-wrapper').forEach(pad => {
        const enabled = next === 'choose' || next === 'explore' || (next === 'correction' && !!pad.querySelector('.flag-correct'));
        pad.setAttribute('aria-disabled', String(!enabled));
        pad.tabIndex = enabled && pad.classList.contains('visible') ? 0 : -1;
    });
    const activeStep = next === 'ready' || next === 'loading' ? 'listen' : next === 'feedback' || next === 'complete' ? 'next' : 'choose';
    document.querySelectorAll<HTMLElement>('[data-game-step]').forEach(step => {
        step.classList.toggle('current', step.dataset.gameStep === activeStep);
        if (step.dataset.gameStep === activeStep) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
    });
    updateChildProgress();
}

export function updateChildProgress(): void {
    const progress = document.getElementById('practice-progress');
    if (!progress) return;
    const total = getCurrentTargetNumber();
    const done = Math.min(getCurrentProfile().stats.identifications, total);
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(done));
    progress.setAttribute('aria-valuetext', `${done} of ${total} sounds practiced`);
    // Five stepping stones describe progress, not accuracy. Never penalize mistakes.
    progress.replaceChildren(...Array.from({ length: 5 }, (_, i) => {
        const stone = document.createElement('span');
        stone.className = 'progress-stone';
        stone.style.setProperty('--fill', `${Math.max(0, Math.min(1, done / total * 5 - i)) * 100}%`);
        stone.setAttribute('aria-hidden', 'true');
        return stone;
    }));
}

export function installParentGate(open: () => void, close: () => void): void {
    const button = document.getElementById('hamburger-link') as HTMLButtonElement;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let suppressClick = false;
    const cancel = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        button.classList.remove('holding');
    };
    const start = () => {
        if (document.body.classList.contains('parent-mode') || timer !== null) return;
        button.classList.add('holding');
        timer = setTimeout(() => {
            cancel();
            suppressClick = true;
            open();
        }, 1200);
    };
    button.addEventListener('pointerdown', e => { if (e.isPrimary && e.button === 0) start(); });
    button.addEventListener('pointerup', cancel);
    button.addEventListener('pointerleave', cancel);
    button.addEventListener('pointercancel', cancel);
    button.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); }
    });
    button.addEventListener('keyup', e => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault(); cancel();
            if (suppressClick) suppressClick = false;
            else if (document.body.classList.contains('parent-mode')) close();
        }
    });
    button.addEventListener('click', () => {
        if (suppressClick) { suppressClick = false; return; }
        if (document.body.classList.contains('parent-mode')) close();
        else document.getElementById('parent-hint')!.textContent = 'Hold the lock for a moment to open parent controls.';
    });
    button.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { cancel(); close(); } });
}
