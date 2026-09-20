import { AudioFileInfo, NoteAudioFileInfo } from './types';
import { AUDIO_FILE_LIST, INSTRUMENTS, NOTE_AUDIO_FILE_LIST, getNoteFilePrefix } from './data';
import { randomElem } from './utils';

let AUDIO_FILES: Map<string, Map<string, AudioFileInfo[]>> | null = null;

function getInstrumentIdForPath(path: string): string {
    return INSTRUMENTS.find(instrument => instrument.chordPath === path)?.id || INSTRUMENTS[0].id;
}

export function getAudioFiles(instrument: string): Map<string, AudioFileInfo[]> {
    if (AUDIO_FILES === null) {
        AUDIO_FILES = new Map();

        for (const file of AUDIO_FILE_LIST) {
            const path = file.split('/')[0];
            const instrumentId = getInstrumentIdForPath(path);
            const filename = file.split('/').pop()!;
            const [base] = filename.split('.');
            const parts = base.split('_');
            const chord = parts[0];
            const color = parts[1];
            const ext = filename.split('.').pop()!;

            const audioFile: AudioFileInfo = {
                filename: file,
                instrument: instrumentId,
                color,
                chord,
                ext,
                elem: null,
            };

            if (!AUDIO_FILES.has(instrumentId)) {
                AUDIO_FILES.set(instrumentId, new Map());
            }
            const instrumentFiles = AUDIO_FILES.get(instrumentId)!;
            if (!instrumentFiles.has(color)) {
                instrumentFiles.set(color, []);
            }
            instrumentFiles.get(color)!.push(audioFile);
        }
    }
    return AUDIO_FILES.get(instrument) || AUDIO_FILES.get(INSTRUMENTS[0].id)!;
}

// One media element retains Safari's user-gesture authorization across sounds.
let player: HTMLAudioElement | null = null;
let playbackId = 0;
export function stopPlayback(): void {
    playbackId++;
    if (player) {
        player.pause();
        player.currentTime = 0;
    }
}

function prepareAudio(src: string, onEnded: () => void): HTMLAudioElement {
    if (!player) {
        player = document.createElement('audio');
        player.preload = 'auto';
        player.setAttribute('playsinline', '');
    }
    if (player.getAttribute('src') !== src) {
        stopPlayback();
        player.src = src;
        player.load();
    }
    player.onended = onEnded;
    return player;
}

export function audioFileElem(audioFile: AudioFileInfo, onEnded: () => void): HTMLAudioElement {
    return prepareAudio('static/chords/' + audioFile.filename, onEnded);
}

export function playMedia(elem: HTMLAudioElement, onStarted: () => void = () => {}): void {
    stopPlayback();
    const id = playbackId;
    const status = document.getElementById('audio-status');
    if (status) status.textContent = '';
    // A failed media request stays failed until load() resets the element.
    if (elem.error) elem.load();
    // Keep play() synchronous with the tap. Never wait for loading/network first.
    void elem.play().then(() => {
        if (id === playbackId) onStarted();
    }).catch(error => {
        if (id !== playbackId || error.name === 'AbortError') return;
        if (status) status.textContent = 'Audio could not start. Tap Play to retry; check your volume and connection.';
    });
}

export function playChordFiles(instrument: string, color: string, onEnded: () => void): void {
    const files = getAudioFiles(instrument).get(color);
    if (files) playMedia(audioFileElem(randomElem(files), onEnded));
}

// --- Single note audio ---

let NOTE_AUDIO_FILES: Map<string, NoteAudioFileInfo[]> | null = null;

export function getNoteAudioFiles(): Map<string, NoteAudioFileInfo[]> {
    if (NOTE_AUDIO_FILES === null) {
        NOTE_AUDIO_FILES = new Map();

        for (const file of NOTE_AUDIO_FILE_LIST) {
            const filename = file.split('/').pop()!;
            const [base] = filename.split('.');
            const parts = base.split('_');
            const notePrefix = parts[0];
            const ext = filename.split('.').pop()!;

            const noteFile: NoteAudioFileInfo = {
                filename: file,
                notePrefix,
                ext,
                elem: null,
            };

            if (!NOTE_AUDIO_FILES.has(notePrefix)) {
                NOTE_AUDIO_FILES.set(notePrefix, []);
            }
            NOTE_AUDIO_FILES.get(notePrefix)!.push(noteFile);
        }
    }
    return NOTE_AUDIO_FILES;
}

export function noteAudioFileElem(noteFile: NoteAudioFileInfo, onEnded: () => void): HTMLAudioElement {
    return prepareAudio('static/notes/' + noteFile.filename, onEnded);
}

export function playNoteFile(note: string, onEnded: () => void): void {
    const prefix = getNoteFilePrefix(note);
    const noteFiles = getNoteAudioFiles().get(prefix);
    if (noteFiles) {
        const noteFile = randomElem(noteFiles);
        playMedia(noteAudioFileElem(noteFile, onEnded));
    }
}
