import { parseBackup } from './backup';
import { STATE, STATE_KEY, SESSION_HISTORY_KEY, getSessionHistory } from './state';

export function initBackupImport(): void {
    const input = document.getElementById('import-progress') as HTMLInputElement;
    const status = document.getElementById('import-status')!;
    const apply = document.getElementById('apply-import') as HTMLButtonElement;
    let pending: ReturnType<typeof parseBackup> | null = null;
    input.addEventListener('change', async () => {
        pending = null;
        apply.hidden = true;
        const file = input.files?.[0];
        if (!file) return;
        try {
            if (file.size > 10 * 1024 * 1024) throw new Error('Backup must be smaller than 10 MB.');
            pending = parseBackup(await file.text());
            status.textContent = `Add ${pending.profiles.length} profiles: ${pending.profiles.map(p => p.name).join(', ')}. Existing profiles will be kept. Unsupported instruments use piano. Single-note practice is not enabled in BSharp; its saved results are retained.`;
            apply.hidden = false;
        } catch (error) { status.textContent = `Could not import: ${(error as Error).message}`; }
    });
    apply.addEventListener('click', () => {
        if (!pending) return;
        const state = JSON.parse(JSON.stringify(STATE)) as typeof STATE;
        const history = JSON.parse(JSON.stringify(getSessionHistory())) as ReturnType<typeof getSessionHistory>;
        for (const profile of pending.profiles) {
            let id = 101;
            while (state.profiles[id]) id++;
            const name = Object.values(state.profiles).some(p => p.name.toLowerCase() === profile.name.toLowerCase())
                ? `${profile.name} (imported)` : profile.name;
            state.profiles[id] = { ...profile, id, name };
            history[id] = pending.history[String(profile.id)] ?? {};
        }
        // Persist history first. If the second write fails, roll back both keys.
        let previousState: string | null = null, previousHistory: string | null = null;
        let captured = false;
        try {
            previousState = localStorage.getItem(STATE_KEY);
            previousHistory = localStorage.getItem(SESSION_HISTORY_KEY);
            captured = true;
            localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
            location.reload();
        } catch {
            if (captured) {
                try {
                    for (const [key, value] of [[STATE_KEY, previousState], [SESSION_HISTORY_KEY, previousHistory]]) {
                        if (value === null) localStorage.removeItem(key!); else localStorage.setItem(key!, value!);
                    }
                } catch { /* Storage is unavailable; preserve the live session. */ }
            }
            status.textContent = 'Could not save the import. Free device storage and retry. Export current progress before closing.';
        }
    });
}
