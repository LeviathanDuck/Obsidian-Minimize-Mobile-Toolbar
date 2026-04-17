import { Plugin, Platform } from 'obsidian';

const ICON_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
const ICON_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

interface Settings { hidden: boolean; }
const DEFAULTS: Settings = { hidden: false };

export default class MinimizeToolbarPlugin extends Plugin {
  settings: Settings;
  private btn: HTMLElement | null = null;
  private closeBtnRect: DOMRect | null = null;

  async onload() {
    await this.loadSettings();
    if (!Platform.isMobile) return;

    this.app.workspace.onLayoutReady(() => {
      this.createButton();
      this.cacheRect();
      this.applyState();
      this.syncIcon();
      this.syncPosition();
      this.startObserver();
    });

    this.registerEvent(this.app.workspace.on('layout-change', () => this.syncAll()));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      setTimeout(() => this.syncAll(), 50);
    }));
  }

  private toolbar(): HTMLElement | null {
    return document.querySelector('.mobile-toolbar');
  }

  private findKeyboardCloseBtn(): HTMLElement | null {
    const t = this.toolbar();
    if (!t) return null;
    const byLabel = t.querySelector('[aria-label*="keyboard" i], [aria-label*="close" i], [aria-label*="dismiss" i]') as HTMLElement;
    if (byLabel) return byLabel;
    const opts = t.querySelectorAll('.mobile-toolbar-option');
    return opts.length ? opts[opts.length - 1] as HTMLElement : null;
  }

  private cacheRect() {
    const closeBtn = this.findKeyboardCloseBtn();
    if (closeBtn) this.closeBtnRect = closeBtn.getBoundingClientRect();
  }

  private startObserver() {
    const observer = new MutationObserver(() => {
      if (!this.settings.hidden) this.cacheRect();
      this.syncPosition();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    this.register(() => observer.disconnect());
  }

  private syncAll() {
    if (!this.settings.hidden) this.cacheRect();
    this.applyState();
    this.syncPosition();
  }

  private createButton() {
    this.btn = document.createElement('div');
    this.btn.addClass('mt-toggle');
    this.syncIcon();
    this.btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    document.body.appendChild(this.btn);
    this.registerDomEvent(this.btn, 'pointerup', () => this.toggle());
    this.wireViewport();
  }

  syncIcon() {
    if (!this.btn) return;
    this.btn.innerHTML = this.settings.hidden ? ICON_SHOW : ICON_HIDE;
  }

  syncPosition() {
    if (!this.btn) return;
    if (this.closeBtnRect) {
      const r = this.closeBtnRect;
      const fromBottom = window.innerHeight - r.bottom;
      if (this.settings.hidden) {
        this.btn.style.bottom = `${fromBottom}px`;
        this.btn.style.right = `${window.innerWidth - r.left + 8}px`;
      } else {
        this.btn.style.bottom = `${fromBottom}px`;
        this.btn.style.right = `${window.innerWidth - r.right}px`;
      }
    } else {
      // Fallback until toolbar is found
      const vv = window.visualViewport;
      const kbHeight = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      this.btn.style.bottom = `calc(${kbHeight + 8}px + env(safe-area-inset-bottom, 0px))`;
      this.btn.style.right = `calc(8px + env(safe-area-inset-right, 0px))`;
    }
  }

  private wireViewport() {
    if (!window.visualViewport) return;
    const handler = () => {
      if (!this.settings.hidden) this.cacheRect();
      this.syncPosition();
    };
    window.visualViewport.addEventListener('resize', handler);
    window.visualViewport.addEventListener('scroll', handler);
    this.register(() => {
      window.visualViewport?.removeEventListener('resize', handler);
      window.visualViewport?.removeEventListener('scroll', handler);
    });
  }

  applyState() {
    const t = this.toolbar();
    if (t) t.style.display = this.settings.hidden ? 'none' : '';
  }

  toggle() {
    if (!this.settings.hidden) this.cacheRect();
    this.settings.hidden = !this.settings.hidden;
    this.applyState();
    this.syncIcon();
    this.syncPosition();
    this.saveSettings();
  }

  onunload() {
    this.btn?.remove();
    const t = this.toolbar();
    if (t) t.style.display = '';
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
