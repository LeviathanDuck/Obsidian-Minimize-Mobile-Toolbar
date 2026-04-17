import { App, Plugin, PluginSettingTab, Setting, Platform } from 'obsidian';

const ICON_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
const ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const ICON_DISMISS_KB = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="9" rx="2"/><path d="M7 8h.01M10 8h.01M13 8h.01M16 8h.01"/><path d="M6 11h12"/><path d="M8 16l4 4 4-4"/></svg>`;

type Strategy = 'center' | 'top-calc' | 'dvh' | 'svh' | 'vv-js' | 'window-js' | 'bottom-fixed';

interface Settings {
  hidden: boolean;
  strategy: Strategy;
  offset: number;
}
const DEFAULTS: Settings = { hidden: false, strategy: 'center', offset: 80 };

const STRATEGY_CLASSES = [
  'mt-pos-center',
  'mt-pos-top-calc',
  'mt-pos-dvh',
  'mt-pos-svh',
  'mt-pos-vv-js',
  'mt-pos-window-js',
  'mt-pos-bottom-fixed',
];

const CLS_HIDDEN = 'mt-hidden';
const CLS_KB_ACTIVE = 'mt-keyboard-active';
const CLS_ACTIVE = 'mt-active';

export default class MinimizeToolbarPlugin extends Plugin {
  settings: Settings;
  private btnMinimize: HTMLElement | null = null;
  private btnExpand: HTMLElement | null = null;
  private btnDismiss: HTMLElement | null = null;
  private capKbHandles: Array<{ remove: () => void }> = [];
  private jsPosTeardown: (() => void) | null = null;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MTSettingTab(this.app, this));
    if (!Platform.isMobile) return;

    this.app.workspace.onLayoutReady(() => {
      document.body.addClass(CLS_ACTIVE);
      this.createButtons();
      this.applyState();
      this.applyStrategy();
      this.wireKeyboardDetection();
    });

    this.registerEvent(this.app.workspace.on('layout-change', () => this.applyState()));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.applyState()));
  }

  private createButtons() {
    this.btnMinimize = this.makeButton('mt-minimize', ICON_MINIMIZE, () => this.setHidden(true));
    this.btnExpand = this.makeButton('mt-expand', ICON_EXPAND, () => this.setHidden(false));
    this.btnDismiss = this.makeButton('mt-dismiss', ICON_DISMISS_KB, () => this.dismissKeyboard());
  }

  private makeButton(id: string, icon: string, onTap: () => void): HTMLElement {
    const el = document.createElement('div');
    el.id = id;
    el.addClass('mt-btn');
    el.innerHTML = icon;
    el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    document.body.appendChild(el);
    this.registerDomEvent(el, 'pointerup', onTap);
    this.register(() => el.remove());
    return el;
  }

  private wireKeyboardDetection() {
    const kb = (window as any).Capacitor?.Plugins?.Keyboard;
    if (kb?.addListener) {
      this.capKbHandles.push(kb.addListener('keyboardWillShow', () => this.setKb(true)));
      this.capKbHandles.push(kb.addListener('keyboardWillHide', () => this.setKb(false)));
      this.register(() => {
        this.capKbHandles.forEach(h => h.remove?.());
        this.capKbHandles = [];
      });
      return;
    }
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const check = () => this.setKb((window.innerHeight - vv.height) > 150);
      vv.addEventListener('resize', check);
      this.register(() => vv.removeEventListener('resize', check));
    }
  }

  private setKb(active: boolean) {
    document.body.toggleClass(CLS_KB_ACTIVE, active);
  }

  private dismissKeyboard() {
    const kb = (window as any).Capacitor?.Plugins?.Keyboard;
    if (kb?.hide) {
      kb.hide();
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur();
  }

  applyState() {
    document.body.toggleClass(CLS_HIDDEN, this.settings.hidden);
  }

  setHidden(hidden: boolean) {
    this.settings.hidden = hidden;
    this.applyState();
    this.saveSettings();
  }

  applyStrategy() {
    // Clear previous JS-driven listeners and inline styles.
    this.jsPosTeardown?.();
    this.jsPosTeardown = null;
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b) {
        b.style.top = '';
        b.style.bottom = '';
        b.style.transform = '';
      }
    });
    // Clear all strategy classes, then apply the active one.
    STRATEGY_CLASSES.forEach(c => document.body.removeClass(c));
    document.body.addClass(`mt-pos-${this.settings.strategy}`);

    // JS-driven strategies need listeners.
    if (this.settings.strategy === 'vv-js') this.setupVvJs();
    if (this.settings.strategy === 'window-js') this.setupWindowJs();
  }

  private setupVvJs() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const top = vv.offsetTop + vv.height - this.settings.offset;
      [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
        if (b) b.style.top = `${top}px`;
      });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    this.jsPosTeardown = () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }

  private setupWindowJs() {
    const update = () => {
      const top = window.innerHeight - this.settings.offset;
      [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
        if (b) b.style.top = `${top}px`;
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    this.jsPosTeardown = () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }

  onunload() {
    this.jsPosTeardown?.();
    STRATEGY_CLASSES.forEach(c => document.body.removeClass(c));
    document.body.removeClass(CLS_HIDDEN);
    document.body.removeClass(CLS_KB_ACTIVE);
    document.body.removeClass(CLS_ACTIVE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class MTSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: MinimizeToolbarPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Button position strategy')
      .setDesc('Each strategy places the buttons differently. Try each on your device and pick the one that sits just above the keyboard.')
      .addDropdown(d => d
        .addOption('center', 'Center of screen (baseline, known working)')
        .addOption('top-calc', 'CSS top: calc(100% - offset)')
        .addOption('dvh', 'CSS top: calc(100dvh - offset) — dynamic viewport')
        .addOption('svh', 'CSS top: calc(100svh - offset) — small viewport')
        .addOption('vv-js', 'JS visualViewport.height - offset (recommended)')
        .addOption('window-js', 'JS window.innerHeight - offset')
        .addOption('bottom-fixed', 'CSS bottom: offset (known bad baseline)')
        .setValue(this.plugin.settings.strategy)
        .onChange(async (value) => {
          this.plugin.settings.strategy = value as Strategy;
          await this.plugin.saveSettings();
          this.plugin.applyStrategy();
        }));

    new Setting(containerEl)
      .setName('Offset (px)')
      .setDesc('Distance from bottom of visible area (or from bottom of screen for bottom-fixed). Applies to every strategy.')
      .addText(t => t
        .setValue(String(this.plugin.settings.offset))
        .onChange(async (value) => {
          const n = Number(value);
          if (!isFinite(n)) return;
          this.plugin.settings.offset = n;
          await this.plugin.saveSettings();
          this.plugin.applyStrategy();
        }));
  }
}
