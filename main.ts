import { App, Plugin, PluginSettingTab, Setting, Platform } from 'obsidian';

interface Settings {
  bottom: number;
  right: number;
  hidden: boolean;
}

const DEFAULTS: Settings = { bottom: 80, right: 16, hidden: false };

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
    });

    this.registerEvent(this.app.workspace.on('layout-change', () => this.applyState()));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.applyState()));
  }

  private toolbar(): HTMLElement | null {
    return document.querySelector('.mobile-toolbar');
  }

  private createButton() {
    this.btn = document.createElement('div');
    this.btn.addClass('mt-toggle');
    this.syncIcon();
    this.syncPosition();
    document.body.appendChild(this.btn);
    this.wireDragAndTap();
    this.wireViewport();
  }

  syncIcon() {
    this.btn?.setText(this.settings.hidden ? '▲' : '▼');
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
    const handler = () => this.syncPosition();
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
      .setDesc('Gap above the keyboard (or screen bottom when keyboard is hidden). Drag the button to reposition.')
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
