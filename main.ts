import { App, Plugin, PluginSettingTab, Setting, Platform, MarkdownView } from 'obsidian';

interface Settings {
  bottom: number;
  right: number;
  hidden: boolean;
}

const DEFAULTS: Settings = { bottom: 8, right: 16, hidden: false };

const ICON_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
const ICON_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;

export default class MinimizeToolbarPlugin extends Plugin {
  settings: Settings;
  private btn: HTMLElement | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));
    if (!Platform.isMobile) return;

    this.app.workspace.onLayoutReady(() => {
      this.createButton();
      this.applyState();
      this.syncVisibility();
    });

    this.registerEvent(this.app.workspace.on('layout-change', () => {
      this.applyState();
      this.syncVisibility();
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.applyState();
      this.syncVisibility();
    }));
  }

  private toolbar(): HTMLElement | null {
    return document.querySelector('.mobile-toolbar');
  }

  private isEditorActive(): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view !== null && view.getMode() !== 'preview';
  }

  private isKeyboardVisible(): boolean {
    if (!window.visualViewport) return false;
    return (window.innerHeight - window.visualViewport.height) > 150;
  }

  syncVisibility() {
    if (!this.btn) return;
    const show = this.isEditorActive() && this.isKeyboardVisible();
    this.btn.style.display = show ? 'flex' : 'none';
  }

  private createButton() {
    this.btn = document.createElement('div');
    this.btn.addClass('mt-toggle');
    this.btn.style.display = 'none';
    this.syncIcon();
    this.syncPosition();
    document.body.appendChild(this.btn);
    this.wireDragAndTap();
    this.wireViewport();
  }

  syncIcon() {
    if (!this.btn) return;
    this.btn.innerHTML = this.settings.hidden ? ICON_SHOW : ICON_HIDE;
  }

  syncPosition() {
    if (!this.btn) return;
    const vv = window.visualViewport;
    const kbHeight = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    const bottom = this.settings.bottom + kbHeight;
    this.btn.style.bottom = `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
    this.btn.style.right = `calc(${this.settings.right}px + env(safe-area-inset-right, 0px))`;
  }

  private wireViewport() {
    if (!window.visualViewport) return;
    const handler = () => {
      this.syncPosition();
      this.syncVisibility();
    };
    window.visualViewport.addEventListener('resize', handler);
    window.visualViewport.addEventListener('scroll', handler);
    this.register(() => {
      window.visualViewport?.removeEventListener('resize', handler);
      window.visualViewport?.removeEventListener('scroll', handler);
    });
  }

  private wireDragAndTap() {
    if (!this.btn) return;
    let moved = false, sx = 0, sy = 0, sr = 0, sb = 0;

    this.registerDomEvent(this.btn, 'pointerdown', (e: PointerEvent) => {
      moved = false;
      sx = e.clientX; sy = e.clientY;
      sr = this.settings.right; sb = this.settings.bottom;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    });

    this.registerDomEvent(this.btn, 'pointermove', (e: PointerEvent) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        moved = true;
        this.settings.right = Math.max(0, sr - dx);
        this.settings.bottom = Math.max(0, sb - dy);
        this.syncPosition();
      }
    });

    this.registerDomEvent(this.btn, 'pointerup', async () => {
      if (!moved) this.toggle();
      await this.saveSettings();
    });
  }

  applyState() {
    const t = this.toolbar();
    if (t) t.style.display = this.settings.hidden ? 'none' : '';
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
    if (t) t.style.display = '';
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: MinimizeToolbarPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Button — bottom (px)')
      .setDesc('Gap above the keyboard top. Drag the button to reposition.')
      .addText(t => t
        .setValue(String(this.plugin.settings.bottom))
        .onChange(async v => {
          this.plugin.settings.bottom = Number(v) || DEFAULTS.bottom;
          this.plugin.syncPosition();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Button — right (px)')
      .setDesc('Distance from right edge of screen.')
      .addText(t => t
        .setValue(String(this.plugin.settings.right))
        .onChange(async v => {
          this.plugin.settings.right = Number(v) || DEFAULTS.right;
          this.plugin.syncPosition();
          await this.plugin.saveSettings();
        }));
  }
}
