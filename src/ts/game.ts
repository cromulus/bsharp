import { CHORDS_TONE, FIRST_BLACK_INDEX } from './data';
import { AudioFileInfo } from './types';
import { randomElem, getCurrentTimestamp } from './utils';
import {
    STATE, getCurrentProfile, getCurrentTargetNumber,
    getCurrentSessionHistory, saveState, saveSessionHistory,
    newStats, isRecent
} from './state';
import { getCurrentCoefficients, updateStartTimeIfNeeded, updateStats, normalizeStatsObject } from './stats';
import { getAudioFiles, audioFileElem, playChordFiles, playMedia, stopPlayback } from './audio';
import { populateFlags, updateStatsDisplay, resetCatEmoji, setCatEmoji, setChordDisplayMode, populateProfileUiElements } from './ui';
import { getChildStage, setChildStage } from './childUi';

let _COLORS: string[] | null = null;
let _CHORDS_ON = false;
export let _CORRECT_COLOR: string | null = null;
let _SELECTED_ELEM: HTMLElement | null = null;
let _CORRECT_ELEM: HTMLElement | null = null;
let _CURRENT_AUDIO: AudioFileInfo | null = null;
let _AUDIO_PLAYED = false;
let correctionPending = false;
let _EMOJI_LOCK = false;
let _CURRENT_COEFFICIENTS: number[] | null = null;
let _PERSIST_REACTION_FACE_ENABLED = false;
export function getTestDeterministicColor(): string | null {
    return (window as unknown as Record<string, unknown>).__bsharp_test_deterministic_color as string | null ?? null;
}

export function getSelectedColors(): string[] {
    const chordIdx = Object.keys(CHORDS_TONE).findIndex(x => x === STATE.current_chord);
    if (_COLORS === null) {
        _COLORS = Object.keys(CHORDS_TONE).slice(0, chordIdx + 1);
    }
    return _COLORS;
}

export function isBlackLevel(level?: number): boolean {
    if (level === undefined) {
        level = getSelectedColors().length;
    }
    return level > FIRST_BLACK_INDEX;
}

export function chordsOn(): boolean {
    return _CHORDS_ON;
}

function onAudioEnded(): void {
    document.body.classList.remove('sound-playing');
}

export function stopCurrentAudio(): void {
    stopPlayback();
    document.body.classList.remove('sound-playing');
    document.querySelectorAll('.preview-playing').forEach(el => el.classList.remove('preview-playing'));
    if (getChildStage() === 'loading') setChildStage('ready');
}


function _getWeights(): number[] | undefined {
    if (getCurrentProfile().chord_selection_mode !== 'adaptive') {
        return undefined;
    }
    if (_CURRENT_COEFFICIENTS !== null) {
        return _CURRENT_COEFFICIENTS;
    }
    _CURRENT_COEFFICIENTS = getCurrentCoefficients();
    return _CURRENT_COEFFICIENTS;
}

export function selectNewColor(): void {
    const weights = _getWeights();
    _CORRECT_COLOR = getTestDeterministicColor() ?? randomElem(getSelectedColors(), weights);
    if (_SELECTED_ELEM !== null) {
        _SELECTED_ELEM.classList.remove('flag-correct');
        _SELECTED_ELEM.classList.remove('flag-incorrect');
        _SELECTED_ELEM = null;
    }
    if (_CORRECT_ELEM !== null) {
        _CORRECT_ELEM.classList.remove('flag-correct');
        _CORRECT_ELEM.classList.remove('flag-incorrect');
        _CORRECT_ELEM = null;
    }
}

export function populateAudio(): void {
    selectNewColor();
    stopCurrentAudio();

    const audioFiles = getAudioFiles(getCurrentProfile().current_instrument);
    const files = audioFiles.get(_CORRECT_COLOR!);
    if (files) {
        const newAudioFile = randomElem(files);
        _CURRENT_AUDIO = newAudioFile;
    }

    const playButton = document.getElementById('play-button');
    if (playButton) playButton.classList.remove('deactivated');
    _AUDIO_PLAYED = false;
    correctionPending = false;
    setChildStage(getCurrentProfile().stats.identifications >= getCurrentTargetNumber() ? 'complete' : 'ready');
}

export function playAudio(): void {
    if (getChildStage() === 'complete' || getChildStage() === 'explore') return;
    const playButton = document.getElementById('play-button');
    if (playButton && playButton.classList.contains('deactivated')) return;
    if (!_CURRENT_AUDIO) return;

    const wasAnswered = _SELECTED_ELEM !== null;
    _AUDIO_PLAYED = false;
    const chord = audioFileElem(_CURRENT_AUDIO, onAudioEnded);
    if (!correctionPending && !wasAnswered) setChildStage('loading');
    playMedia(chord, () => {
        _AUDIO_PLAYED = true;
        document.body.classList.add('sound-playing');
        if (correctionPending) {
            correctionPending = false;
            setChildStage('feedback');
        } else if (!wasAnswered) setChildStage('choose');
    }, () => {
        if (!wasAnswered) setChildStage('ready');
    });
}

export function toggleExplore(): void {
    if (getChildStage() === 'complete') return;
    const exploring = getChildStage() === 'explore';
    populateAudio();
    if (!exploring) setChildStage('explore');
}


export function selectFlagWrapper(wrapperElem: HTMLElement): void {
    if (document.body.classList.contains('parent-mode')) return;
    if (getChildStage() === 'complete') return;
    if (getChildStage() === 'explore') {
        playChord(wrapperElem.dataset.color!);
        return;
    }
    if (correctionPending) {
        if (wrapperElem.dataset.color === _CORRECT_COLOR) playAudio();
        return;
    }
    if (_SELECTED_ELEM !== null || !_AUDIO_PLAYED) return;
    stopCurrentAudio();

    const chosenColor = wrapperElem.dataset.color;
    const elem = wrapperElem.querySelector(':scope > .flag') as HTMLElement | null;
    if (!chosenColor || !elem) return;

    const flagHolder = document.getElementById('flag-holder')!;

    _EMOJI_LOCK = true;
    updateStartTimeIfNeeded();
    updateStats(_CORRECT_COLOR!, chosenColor);
    updateStatsDisplay();

    const isCorrect = chosenColor === _CORRECT_COLOR;
    if (isCorrect) {
        elem.classList.add('flag-correct');
        setCatEmoji(6);
    } else {
        elem.classList.add('flag-incorrect');
        _CORRECT_ELEM = flagHolder.querySelector(`div[data-color="${_CORRECT_COLOR}"]>div.flag`)!;
        if (_CORRECT_ELEM) _CORRECT_ELEM.classList.add('flag-correct');
        setCatEmoji(5);
    }
    _SELECTED_ELEM = elem;
    correctionPending = !isCorrect;
    setChildStage(isCorrect ? 'feedback' : 'correction');

    if (getCurrentProfile().persist_reaction_face &&
        getCurrentProfile().stats.identifications < getCurrentTargetNumber()) {
        _PERSIST_REACTION_FACE_ENABLED = true;
    } else {
        setTimeout(() => {
            _EMOJI_LOCK = false;
            resetCatEmoji();
        }, 1500);
    }

    if (_CHORDS_ON && getCurrentProfile().reveal_chord_mode === 'after_guess') {
        document.getElementById('flag-holder')!.classList.add('chord-notes');
    }

    // Single note trainer disabled for now

}

export function nextAudio(): void {
    const nextButton = document.getElementById('next-chord');
    if (!nextButton || nextButton.classList.contains('deactivated')) return;

    if (getCurrentProfile().stats.identifications >= getCurrentTargetNumber()) {
        stopCurrentAudio();
        getCurrentProfile().stats.done = true;
        saveSessionHistory();
        saveState();
        setChildStage('complete');
        return;
    }

    if (_CHORDS_ON && getCurrentProfile().reveal_chord_mode === 'after_guess') {
        document.getElementById('flag-holder')!.classList.remove('chord-notes');
    }

    populateAudio();
    playAudio();
    nextButton.classList.add('deactivated');
}

export function resetStats(done = true): void {
    getCurrentProfile().stats.done = done;
    if (!done || getCurrentProfile().stats.identifications > 0) {
        saveSessionHistory();
    }
    if (_PERSIST_REACTION_FACE_ENABLED && done) {
        resetCatEmoji();
        _PERSIST_REACTION_FACE_ENABLED = false;
        _EMOJI_LOCK = false;
    }
    getCurrentProfile().stats = newStats();
    _CURRENT_COEFFICIENTS = null;
    saveState();
    updateStatsDisplay();
    populateAudio();
}

function retrieveSavedStats(): void {
    const currentHistory = getCurrentSessionHistory();
    if (currentHistory !== undefined && currentHistory.length > 0) {
        const lastSession = currentHistory[currentHistory.length - 1];
        if (!lastSession.done) {
            getCurrentProfile().stats = currentHistory.pop()!;
            if (!isRecent(lastSession.updated_time)) {
                resetStats(true);
            }
        }
    }
    updateStatsDisplay();
}

export function changeSelector(to?: string): void {
    const chordSelector = document.getElementById('chord-selector') as HTMLSelectElement;

    if (to !== undefined) {
        chordSelector.value = to;
    }

    const currentProfile = getCurrentProfile();
    if (STATE.current_chord !== chordSelector.value) {
        resetStats(false);
        STATE.current_chord = chordSelector.value;
        currentProfile.current_chord = chordSelector.value;
        currentProfile.stats.current_chord = currentProfile.current_chord;
        retrieveSavedStats();
    }

    _COLORS = null;
    _CHORDS_ON = (currentProfile.show_chord_mode === 'always'
        || (isBlackLevel() && currentProfile.show_chord_mode === 'black_only'));

    populateFlags(getSelectedColors, chordsOn);
    populateAudio();
    saveState();

}

export function changeInstrumentSelector(to?: string): void {
    const instrumentSelector = document.getElementById('instrument-selector') as HTMLSelectElement;
    if (!instrumentSelector) return;

    if (to !== undefined) {
        instrumentSelector.value = to;
    }

    const currentProfile = getCurrentProfile();
    if (currentProfile.current_instrument !== instrumentSelector.value) {
        stopCurrentAudio();
        currentProfile.current_instrument = instrumentSelector.value;
        populateAudio();
        saveState();

    }
}

export function playChord(color: string): void {
    playChordFiles(getCurrentProfile().current_instrument, color, () => {
        document.querySelectorAll('.preview-playing').forEach(el => el.classList.remove('preview-playing'));
    });
    document.querySelectorAll('.preview-playing').forEach(el => el.classList.remove('preview-playing'));
    document.getElementById(`${color}-flag`)?.classList.add('preview-playing');
}

export function getEmojiLock(): boolean {
    return _EMOJI_LOCK;
}
