console.log('window.electronAPI:', window.electronAPI);
if (!window.electronAPI) alert('electronAPI no está disponible en el renderer');

window.electronAPI.onUpdateAvailable((_, version) => {
    console.log('Evento update-available recibido, versión:', version);
    newVersionAvailable = version;
    const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
    if (updatedTextEl) {
        updatedTextEl.innerHTML = `${currentTranslations.updateAvailableText} <br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'New version:'} v${version}</span>`;
    }
    const updateBtn = document.getElementById('update-launcher-btn');
    if (updateBtn) updateBtn.style.display = 'block';
});

if (window.require) {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.on('download-mod-error', (_event, message) => {
        alert('Error al descargar el mod:\n' + message);
    });
}

let currentTranslations = {}, newVersionAvailable = null;

document.addEventListener('DOMContentLoaded', function () {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const modRows = document.querySelectorAll('.mods-table tbody tr');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            let filter = this.id.replace('filter-', '');

            modRows.forEach(row => {
                if (filter === 'all') {
                    row.style.display = '';
                } else {
                    if (row.getAttribute('data-category') === filter) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    });

    document.body.addEventListener('click', function (e) {
        const target = e.target.closest('a');
        if (target && target.closest('.disclaimer-text')) {
            e.preventDefault();
            window.electronAPI.openExternal(target.href);
        }
    });
});

function setupModButton(modId, options) {
    const btn = document.querySelector(`.download-mod-spore-btn[data-mod-id="${modId}"]`);
    if (!btn) return;

    const container = btn.closest('.mod-action-container');
    const progressBar = container.querySelector('.mod-progress-bar');
    const progressFill = progressBar.querySelector('.progress-bar-fill');
    let uninstallFill = progressBar.querySelector('.progress-bar-fill-uninstall');
    let progressText = container.querySelector('.progress-bar-text');
    if (!progressText) {
        progressText = document.createElement('span');
        progressText.className = 'progress-bar-text';
        progressText.style.color = '#fff';
        progressText.style.fontSize = '0.95em';
        progressText.style.display = 'block';
        progressText.style.marginTop = '4px';
        container.appendChild(progressText);
    }

    async function updateState() {
        const isInstalled = await options.isInstalled();
        const span = btn.querySelector('span[data-i18n]');
        const icon = btn.querySelector('img');
        if (isInstalled) {
            btn.classList.add('uninstall-mod-spore-btn');
            if (span) {
                span.setAttribute('data-i18n', 'uninstall');
                span.textContent = currentTranslations.uninstall || 'Uninstall';
            }
            if (icon) icon.src = 'assets/spore-uninstall.png';
        } else {
            btn.classList.remove('uninstall-mod-spore-btn');
            if (span) {
                span.setAttribute('data-i18n', 'download');
                span.textContent = currentTranslations.download || 'Download';
            }
            if (icon) icon.src = 'assets/spore.png';
        }
    }

    let downloadListener = null;
    let installListener = null;

    btn.onclick = async (e) => {
        e.stopPropagation();
        await updateState();
        const span = btn.querySelector('span[data-i18n]');
        if (span && span.getAttribute('data-i18n') === 'uninstall') {

            if (progressFill) {
                progressFill.style.display = 'none';
                progressFill.style.width = '0%';
            }
            if (!uninstallFill) {
                uninstallFill = document.createElement('div');
                uninstallFill.className = 'progress-bar-fill-uninstall';
                uninstallFill.style.width = '0%';
                uninstallFill.style.height = '100%';
                uninstallFill.style.background = '#ff4d4f';
                uninstallFill.style.borderRadius = '6px';
                uninstallFill.style.transition = 'width 5s';
                progressBar.appendChild(uninstallFill);
            }
            uninstallFill.style.width = '0%';
            uninstallFill.style.display = 'block';
            btn.style.display = 'none';
            progressBar.style.display = 'block';
            progressText.textContent = currentTranslations.uninstalling || 'Desinstalando...';
            setTimeout(() => uninstallFill.style.width = '100%', 100);
            setTimeout(async () => {
                await options.uninstall();
                progressBar.style.display = 'none';
                uninstallFill.style.width = '0%';
                uninstallFill.style.display = 'none';
                if (progressFill) progressFill.style.display = 'block';
                btn.style.display = '';
                progressText.textContent = '';
                await updateState();
            }, 5100);
        } else {

            const modUrl = btn.getAttribute('data-mod-url');
            if (!modUrl) return;
            if (progressFill) {
                progressFill.style.display = 'block';
                progressFill.style.width = '0%';
                progressFill.style.transition = 'width 0.2s';
            }
            progressText.textContent = '';
            if (uninstallFill) {
                uninstallFill.style.display = 'none';
                uninstallFill.style.width = '0%';
            }
            btn.style.display = 'none';
            progressBar.style.display = 'block';

            const thisModId = modId;
            downloadListener = (progress) => {
                if (progress.modId && progress.modId !== thisModId) return;
                if (progressFill) progressFill.style.width = `${progress.percent}%`;
                if (progressText) progressText.textContent = `${currentTranslations.downloadingLong || 'Descargando...'} ${progress.percent}%`;
            };
            window.electronAPI.onModDownloadProgress(downloadListener);

            let zipPath, extractedPath;
            try {
                zipPath = await options.download(modUrl);
            } catch (e) {
                if (progressFill) progressFill.style.width = '0%';
                if (progressText) progressText.textContent = '';
                btn.style.display = '';
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressText.textContent = '';
                }, 2000);
                return;
            }

            installListener = (progress) => {
                if (progress.modId && progress.modId !== thisModId) return;
                if (progressFill) progressFill.style.width = `${progress.percent}%`;
                if (progressText) progressText.textContent = `${currentTranslations.installingLong || 'Instalando...'} ${progress.copied}/${progress.total}`;
            };
            window.electronAPI.onModInstallProgress(installListener);

            try {
                extractedPath = await options.unzip(zipPath);
                await options.install(extractedPath, zipPath);
            } catch (e) {
                if (progressFill) progressFill.style.width = '0%';
                if (progressText) progressText.textContent = '';
                btn.style.display = '';
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressText.textContent = '';
                }, 2000);
                return;
            }

            setTimeout(async () => {
                progressBar.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
                if (progressText) progressText.textContent = '';
                await updateState();
                btn.style.display = '';
            }, 1000);
        }
    };

    updateState();
}

async function updateModButtons() {
    setupModButton('unlock60fps', {
        isInstalled: window.electronAPI.isUnlock60fpsInstalled,
        uninstall: window.electronAPI.uninstallUnlock60fps,
        download: window.electronAPI.downloadModWithProgress,
        unzip: window.electronAPI.unzipMod,
        install: window.electronAPI.installSporemod
    });
    setupModButton('HDTextures', {
        isInstalled: window.electronAPI.isHDTexturesInstalled,
        uninstall: window.electronAPI.uninstallHDTextures,
        download: window.electronAPI.downloadModWithProgress,
        unzip: window.electronAPI.unzipMod,
        install: window.electronAPI.installHDTextures
    });
    setupModButton('4gbpatch', {
        isInstalled: window.electronAPI.is4gbPatchInstalled,
        uninstall: window.electronAPI.uninstall4gbPatch,
        download: window.electronAPI.downloadModWithProgress,
        unzip: window.electronAPI.unzipMod,
        install: window.electronAPI.install4gbPatch
    });

}

window.addEventListener('DOMContentLoaded', async () => {
    const splash = document.getElementById('splash-screen');
    document.body.classList.add('transparent-launcher');
    Array.from(document.body.children).forEach(el => {
        if (el.id !== 'splash-screen') el.style.display = 'none';
    });
    splash.style.display = 'flex';

    await updateModButtons();

    await new Promise(resolve => setTimeout(resolve, 1000));

    document.body.classList.remove('transparent-launcher');
    Array.from(document.body.children).forEach(el => {
        if (el.id !== 'splash-screen') el.style.display = '';
    });
    splash.style.display = 'none';

    document.querySelector('.launcher-header .window-close')?.addEventListener('click', () => window.electronAPI.closeWindow());
    document.getElementById('discord-btn')?.addEventListener('click', () => window.electronAPI.openDiscord());
    document.querySelector('.footer-item img[alt="Kofi"]')?.parentElement.addEventListener('click', () => {
        window.electronAPI.openKofi();
    });
    document.querySelectorAll('.window-maximize').forEach(btn =>
        btn.addEventListener('click', () => window.electronAPI.maximizeWindow())
    );
    document.querySelectorAll('.window-minimize').forEach(btn =>
        btn.addEventListener('click', () => window.electronAPI.minimizeWindow())
    );

    document.getElementById('update-launcher-btn')?.addEventListener('click', async function () {
        if (confirm(currentTranslations.updateConfirm)) {
            this.disabled = true;
            this.textContent = currentTranslations.updatingNow;
            await window.electronAPI.downloadUpdate();
            window.electronAPI.updateLauncher();
        }
    });

    await updateModButtons();

    const searchInput = document.getElementById('mods-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const filter = this.value.trim().toLowerCase();
            document.querySelectorAll('.mods-table tbody tr').forEach(row => {
                const nameCell = row.querySelector('.mod-main-title');
                if (!nameCell) return;
                const modName = nameCell.textContent.trim().toLowerCase();
                row.style.display = modName.includes(filter) ? '' : 'none';
            });
        });
    }

    const settingsModal = document.getElementById('settings-modal');
    const settingsModalContent = settingsModal?.querySelector('.mods-modal-content');
    document.querySelector('.footer-settings')?.addEventListener('click', () => {
        document.getElementById('mods-modal')?.classList.add('hidden');
        if (settingsModal.classList.contains('hidden')) {
            settingsModal.classList.remove('hidden', 'animating-out');
            settingsModal.classList.add('animating-in');
            settingsModalContent.classList.remove('animating-out');
            settingsModalContent.classList.add('animating-in');
            setTimeout(() => {
                settingsModal.classList.remove('animating-in');
                settingsModalContent.classList.remove('animating-in');
            }, 350);
        }
    });
    document.getElementById('close-settings-modal')?.addEventListener('click', e => {
        e.preventDefault();
        settingsModal?.classList.add('animating-out');
        settingsModalContent?.classList.add('animating-out');
        setTimeout(() => {
            settingsModal?.classList.add('hidden');
            settingsModal?.classList.remove('animating-out');
            settingsModalContent?.classList.remove('animating-out');
        }, 250);
    });

    const modsModal = document.getElementById('mods-modal');
    const modsModalContent = modsModal.querySelector('.mods-modal-content');

    document.querySelector('.footer-item img[alt="Install Mods"]')?.parentElement.addEventListener('click', () => {
        const settingsModal = document.getElementById('settings-modal');
        const settingsModalContent = settingsModal?.querySelector('.mods-modal-content');
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('animating-in', 'animating-out');
            settingsModalContent?.classList.remove('animating-in', 'animating-out');
        }

        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        const allBtn = document.getElementById('filter-all');
        if (allBtn) allBtn.classList.add('active');
        document.querySelectorAll('.mods-table tbody tr').forEach(row => {
            row.style.display = '';
        });

        const modsModal = document.getElementById('mods-modal');
        const modsModalContent = modsModal.querySelector('.mods-modal-content');
        if (modsModal.classList.contains('hidden')) {
            modsModal.classList.remove('hidden', 'animating-out');
            modsModal.classList.add('animating-in');
            modsModalContent.classList.remove('animating-out');
            modsModalContent.classList.add('animating-in');
            setTimeout(() => {
                modsModal.classList.remove('animating-in');
                modsModalContent.classList.remove('animating-in');
            }, 350);
        }
    });

    document.getElementById('close-mods-modal')?.addEventListener('click', e => {
        e.preventDefault();
        const modsModal = document.getElementById('mods-modal');
        const modsModalContent = modsModal.querySelector('.mods-modal-content');
        modsModal.classList.add('animating-out');
        modsModalContent.classList.add('animating-out');
        setTimeout(() => {
            modsModal.classList.add('hidden');
            modsModal.classList.remove('animating-out');
            modsModalContent.classList.remove('animating-out');
        }, 250);
    });


    document.querySelector('.play-btn-spore')?.addEventListener('click', async () => {
        if (!await window.electronAPI.launchSpore()) alert(currentTranslations.sporeLaunchError);
    });


    window.electronAPI.onUpdateDownloaded(() => {
        const updateBtn = document.getElementById('update-launcher-btn');
        if (updateBtn) updateBtn.style.display = 'block';
        const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
        if (updatedTextEl) {
            let versionInfo = newVersionAvailable ? `<br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'New version:'} v${newVersionAvailable}</span>` : '';
            updatedTextEl.innerHTML = currentTranslations.updateAvailableText + versionInfo;
        }
    });

    window.electronAPI.onWindowMaximizeChanged?.((_, isMaximized) => {
        const header = document.querySelector('.launcher-header');
        if (header) {
            if (isMaximized) {
                header.style.webkitAppRegion = 'no-drag';
            } else {
                header.style.webkitAppRegion = 'drag';
            }
        }
    });


    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', async () => {
            const lang = langSelect.value;
            localStorage.setItem('sporeLang', lang);
            await window.electronAPI.setLanguage(lang);
            await loadLocale(lang);
        });
        langSelect.value = localStorage.getItem('sporeLang') || 'en';
        loadLocale(langSelect.value);
    } else {
        loadLocale('en');
    }
});

async function loadLocale(lang) {
    const localePath = lang === 'es' ? 'locales/es.json' : 'locales/en.json';
    const response = await fetch(localePath);
    if (!response.ok) return;
    const translations = await response.json();
    currentTranslations = translations;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!translations[key]) return;

        if (key === 'disclaimerText') {
            el.innerHTML = translations[key];
            return;
        }


        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
            el.placeholder = translations[key];
        } else if (el.children.length === 0) {
            el.textContent = translations[key];
        } else {
            const span = el.querySelector('span');
            if (span) span.textContent = translations[key];
        }
    });



    const searchInput = document.getElementById('mods-search-input');
    if (searchInput && translations.modsSearchPlaceholder) {
        searchInput.placeholder = translations.modsSearchPlaceholder;
    }

    document.title = translations['title'] || document.title;

    const launcherTitleEl = document.querySelector('.launcher-title');
    if (launcherTitleEl && window.electronAPI.getAppVersion) {
        launcherTitleEl.textContent = currentTranslations.launcherTitle || 'Spore NEXT Launcher';
        const version = await window.electronAPI.getAppVersion();
        launcherTitleEl.innerHTML += ` <span style="color:#aaa;font-size:0.85em;">v${version}</span>`;
    }

    const updatedTextEl = document.querySelector('[data-i18n="updatedText"]');
    if (updatedTextEl && newVersionAvailable) {
        updatedTextEl.innerHTML = `${currentTranslations.updateAvailableText} <br><span style="color:#aaa;">${currentTranslations.newVersionLabel || 'Nueva versión:'} v${newVersionAvailable}</span>`;
    }
}

document.getElementById('extra-action-btn')?.addEventListener('click', async () => {
    if (confirm(currentTranslations.uninstallAllConfirm || "¿Seguro que quieres desinstalar todos los mods?")) {
        const success = await window.electronAPI.uninstallAllMods();
        await updateModButtons();
        if (success) {
            alert(currentTranslations.uninstallAllSuccess || "Todos los mods han sido desinstalados.");
        } else {
            alert(currentTranslations.uninstallAllNone || "No había mods instalados para desinstalar.");
        }
    }
});