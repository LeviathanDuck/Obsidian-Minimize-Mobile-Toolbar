import { Plugin, Platform } from 'obsidian';

const ICON_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
const ICON_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

interface Settings { hidden: boolean; }
const DEFAULTS: Settings = { hidden: false };

export default class MinimizeToolbarPlugin extends Plugin {
  settings: Settings;
  private btn: HTMLElement | null = null;

  async onload() {
    await this.loadSettings();
    if (!Platform.isMobile) return;
    this.app.workspace.onLayoutReady(() => {
      this.createButton();
      this.applyState();
    });
    this.registerEvent(this.app.workspace.on('layout-change', () => this.applyState()));
  }

  private toolbar(): HTMLElement | null {
    return document.querySelector('.mobile-toolbar');
  }

  private toolbarWrap(): HTMLElement | null {
    return this.toolbar()?.parentElement ?? null;
  }

  private createButton() {
    this.btn = document.createElement('div');
    this.btn.addClass('mt-toggle');
    this.syncIcon();
    this.btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    document.body.appendChild(this.btn);
    this.registerDomEvent(this.btn, 'pointerup', () => this.toggle());
  }

  syncIcon() {
    if (!this.btn) return;
    // hidden=true → toolbar is hidden → show the expand icon
    // hidden=false → toolbar is visible → show the hide icon
    this.btn.innerHTML = this.settings.hidden ? ICON_SHOW : ICON_HIDE;
  }

  applyState() {
    const t = this.toolbar();
    const w = this.toolbarWrap();
    if (this.settings.hidden) {
      if (t) t.style.display = 'none';
      if (w) w.style.display = 'none';
    } else {
      if (t) t.style.display = '';
      if (w) w.style.display = '';
    }
  }

  toggle() {
    this.settings.hidden = !this.settings.hidden;
    this.applyState();
    this.syncIcon();
    this.saveSettings();
  }

  onunload() {
    this.btn?.remove();
    const t = this.toolbar();
    const w = this.toolbarWrap();
    if (t) t.style.display = '';
    if (w) w.style.display = '';
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
