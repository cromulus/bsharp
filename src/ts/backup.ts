import { CHORDS_TONE, INSTRUMENTS } from './data';
import { Profile, SessionStats } from './types';
import { initializeProfileDefaults } from './state';

type History = Record<string, Record<string, SessionStats[]>>;
function object(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a backup object.');
    return value as Record<string, any>;
}
function count(value: unknown): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid session count.');
    return value;
}
function chord(value: unknown): string {
    if (typeof value !== 'string' || !Object.hasOwnProperty.call(CHORDS_TONE, value)) throw new Error('Unknown chord in backup.');
    return value;
}
function tally(value: unknown) {
    const data = object(value);
    const correct = count(data.correct), identifications = count(data.identifications);
    if (correct > identifications) throw new Error('Invalid session results.');
    const matrix = object(data.confusion_matrix);
    for (const row of Object.values(matrix)) for (const n of Object.values(object(row))) count(n);
    return { correct, identifications, confusion_matrix: matrix };
}
function session(value: unknown): SessionStats {
    const data = object(value);
    for (const time of [data.start_time, data.updated_time]) {
        if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) throw new Error('Invalid session date.');
    }
    if (typeof data.done !== 'boolean') throw new Error('Invalid session status.');
    return { ...tally(data), current_chord: chord(data.current_chord), start_time: data.start_time, updated_time: data.updated_time,
        done: data.done, notes: data.notes == null ? { correct: 0, identifications: 0, confusion_matrix: {} } : tally(data.notes) };
}

// Compatible with CIM format_version 1 and older unversioned BSharp exports.
// Import as new profiles: no ambiguous name matching or destructive replacement.
export function parseBackup(text: string): { profiles: Profile[]; history: History } {
    const data = object(JSON.parse(text, (key, value) => {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid backup key.');
        return value;
    }));
    if (data.format_version !== undefined && data.format_version !== 1) throw new Error('Unsupported backup version.');
    const profiles: Profile[] = [];
    const ids = new Set<number>();
    for (const value of Object.values(object(object(data.state).profiles))) {
        const p = object(value);
        const id = Number(p.id);
        if (!Number.isSafeInteger(id) || id < 0 || ids.has(id)) throw new Error('Invalid or duplicate profile ID.');
        ids.add(id);
        if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100) throw new Error('Invalid profile name.');
        if (typeof p.icon !== 'string' || !/^fa-[a-z0-9-]+$/.test(p.icon)) throw new Error('Invalid profile icon.');
        const profile = { ...p, id, name: p.name.trim(), target_number: Number(p.target_number ?? 25),
            current_chord: chord(p.current_chord ?? 'yellow'), stats: session(p.stats),
            current_instrument: INSTRUMENTS.some(i => i.id === p.current_instrument) ? p.current_instrument : 'piano_1',
        } as Profile;
        if (!Number.isSafeInteger(profile.target_number) || profile.target_number < 1) throw new Error('Invalid practice target.');
        initializeProfileDefaults(profile);
        const choices: Record<string, string[]> = {
            show_chord_mode: ['always', 'black_only', 'never'], reveal_chord_mode: ['always', 'after_guess'],
            chord_display_mode: ['shapes_and_letters', 'shapes_only', 'letters_only'],
            single_note_mode: ['white_only_on_black', 'all_on_black', 'always', 'never'],
            single_note_correctness_mode: ['only_correct', 'only_incorrect', 'always'],
            color_scheme: ['dark', 'light'], chord_selection_mode: ['random', 'adaptive'],
        };
        for (const [key, values] of Object.entries(choices)) {
            if (!values.includes((profile as any)[key])) throw new Error(`Invalid setting: ${key}.`);
        }
        for (const key of ['persist_reaction_face', 'enable_onboarding_hints']) {
            if (typeof (profile as any)[key] !== 'boolean') throw new Error(`Invalid setting: ${key}.`);
        }
        profiles.push(profile);
    }
    if (!profiles.length) throw new Error('No profiles in this backup.');
    const history: History = {};
    for (const [id, value] of Object.entries(object(data.history ?? {}))) {
        if (!ids.has(Number(id))) throw new Error('History references an unknown profile.');
        history[id] = {};
        for (const [level, entries] of Object.entries(object(value))) {
            chord(level);
            if (!Array.isArray(entries)) throw new Error('Invalid session history.');
            history[id][level] = entries.map(session);
        }
    }
    return { profiles, history };
}
