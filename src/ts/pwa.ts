export async function initPwa(): Promise<void> {
    const status = document.getElementById('offline-status')!;
    if (window.BSharpAndroid) {
        (document.querySelector('.pwa-settings') as HTMLElement).hidden = true;
        return;
    }
    if (matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) {
        document.getElementById('install-help')!.hidden = true;
    }
    if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) {
        status.textContent = 'Offline installation requires HTTPS (or localhost).';
        return;
    }
    status.textContent = 'Preparing offline practice…';
    try {
        const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
        const showUpdate = () => { status.textContent = 'Update ready. Close all BSharp windows and reopen to update.'; };
        if (registration.waiting) showUpdate();
        const observeInstall = () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
                if (worker.state === 'redundant') status.textContent = 'Offline download failed. Reopen online to retry.';
            });
        };
        observeInstall();
        registration.addEventListener('updatefound', observeInstall);
        await navigator.serviceWorker.ready;
        if (!registration.waiting) status.textContent = 'Ready for offline practice';
        // Best effort; browsers retain discretion to evict device storage.
        navigator.storage?.persist?.().catch(() => false);
    } catch {
        status.textContent = 'Offline setup unavailable. Reopen online to retry.';
    }
}
