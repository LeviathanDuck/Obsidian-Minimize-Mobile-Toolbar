import { App, Plugin, PluginSettingTab, Setting, Platform } from 'obsidian';

const ICON_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
const ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const ICON_DISMISS_KB = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="9" rx="2"/><path d="M7 8h.01M10 8h.01M13 8h.01M16 8h.01"/><path d="M6 11h12"/><path d="M8 16l4 4 4-4"/></svg>`;

type Strategy =
  | 'flex-sibling'
  | 'center'
  | 'top-calc'
  | 'dvh'
  | 'svh'
  | 'vv-js'
  | 'window-js'
  | 'bottom-fixed';

interface Settings {
  hidden: boolean;
  strategy: Strategy;
  offsetVisible: number;
  offsetHidden: number;
}
const DEFAULTS: Settings = {
  hidden: false,
  strategy: 'flex-sibling',
  offsetVisible: 120,
  offsetHidden: 60,
};

const STRATEGY_CLASSES = [
  'mt-pos-flex-sibling',
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
const CONTAINER_ID = 'mt-flex-container';

export default class MinimizeToolbarPlugin extends Plugin {
  settings: Settings;
  private btnMinimize: HTMLElement | null = null;
  private btnExpand: HTMLElement | null = null;
  private btnDismiss: HTMLElement | null = null;
  private flexContainer: HTMLElement | null = null;
  private capKbHandles: Array<{ remove: () => void }> = [];
  private strategyTeardown: (() => void) | null = null;

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

    this.registerEvent(this.app.workspace.on('layout-change', () => {
      this.applyState();
      this.reapplyFlexSiblingIfNeeded();
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.applyState();
      this.reapplyFlexSiblingIfNeeded();
    }));
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
    // Re-apply strategy so per-state offset is picked up
    this.applyStrategy();
  }

  setHidden(hidden: boolean) {
    this.settings.hidden = hidden;
    this.applyState();
    this.saveSettings();
  }

  private currentOffset(): number {
    return this.settings.hidden ? this.settings.offsetHidden : this.settings.offsetVisible;
  }

  applyStrategy() {
    // Tear down previous
    this.strategyTeardown?.();
    this.strategyTeardown = null;
    // Reset inline styles on buttons
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b) {
        b.style.top = '';
        b.style.bottom = '';
        b.style.transform = '';
      }
    });
    // Clear all strategy body classes
    STRATEGY_CLASSES.forEach(c => document.body.removeClass(c));

    // Move buttons back to body (in case they were inside flex container)
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b && b.parentElement !== document.body) document.body.appendChild(b);
    });
    // Remove old flex container
    if (this.flexContainer) {
      this.flexContainer.remove();
      this.flexContainer = null;
    }

    document.body.addClass(`mt-pos-${this.settings.strategy}`);

    switch (this.settings.strategy) {
      case 'flex-sibling': this.setupFlexSibling(); break;
      case 'vv-js': this.setupVvJs(); break;
      case 'window-js': this.setupWindowJs(); break;
      case 'top-calc': this.setInlineTop(`calc(100% - ${this.currentOffset()}px)`); break;
      case 'dvh': this.setInlineTop(`calc(100dvh - ${this.currentOffset()}px)`); break;
      case 'svh': this.setInlineTop(`calc(100svh - ${this.currentOffset()}px)`); break;
      case 'bottom-fixed': this.setInlineBottom(`${this.currentOffset()}px`); break;
      case 'center': /* pure CSS — top: 50% */ break;
    }
  }

  private setInlineTop(val: string) {
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b) b.style.top = val;
    });
  }

  private setInlineBottom(val: string) {
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b) b.style.bottom = val;
    });
  }

  private setupFlexSibling() {
    const appContainer = document.querySelector('.app-container') as HTMLElement | null;
    if (!appContainer) return;

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.addClass('mt-flex-container');
    container.style.marginBottom = `${this.currentOffset()}px`;
    this.flexContainer = container;

    // Move buttons into container
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b) container.appendChild(b);
    });

    // Insert just before .mobile-toolbar (so we sit directly above it); fallback to before .mobile-navbar
    const toolbar = document.querySelector('.mobile-toolbar');
    const navbar = document.querySelector('.mobile-navbar');
    if (toolbar && toolbar.parentElement === appContainer) {
      appContainer.insertBefore(container, toolbar);
    } else if (navbar && navbar.parentElement === appContainer) {
      appContainer.insertBefore(container, navbar);
    } else {
      appContainer.appendChild(container);
    }

    this.strategyTeardown = () => {
      // Move buttons back to body
      [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
        if (b) document.body.appendChild(b);
      });
      container.remove();
      if (this.flexContainer === container) this.flexContainer = null;
    };
  }

  private reapplyFlexSiblingIfNeeded() {
    if (this.settings.strategy !== 'flex-sibling') return;
    // If the container fell out of the DOM (e.g. Obsidian re-rendered), re-insert
    if (!this.flexContainer || !document.body.contains(this.flexContainer)) {
      this.applyStrategy();
    }
  }

  private setupVvJs() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const top = vv.offsetTop + vv.height - this.currentOffset();
      this.setInlineTop(`${top}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    this.strategyTeardown = () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }

  private setupWindowJs() {
    const update = () => {
      const top = window.innerHeight - this.currentOffset();
      this.setInlineTop(`${top}px`);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    this.strategyTeardown = () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }

  onunload() {
    this.strategyTeardown?.();
    STRATEGY_CLASSES.forEach(c => document.body.removeClass(c));
    document.body.removeClass(CLS_HIDDEN);
    document.body.removeClass(CLS_KB_ACTIVE);
    document.body.removeClass(CLS_ACTIVE);
    if (this.flexContainer) {
      this.flexContainer.remove();
      this.flexContainer = null;
    }
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
      .setDesc('Flex-sibling is the default — it mimics gay-toolbar by inserting a container into .app-container, so Obsidian handles the keyboard-aware positioning. The rest are alternates to test if flex-sibling misbehaves.')
      .addDropdown(d => d
        .addOption('flex-sibling', 'Flex sibling in .app-container (gay-toolbar style, default)')
        .addOption('center', 'Center of screen (baseline)')
        .addOption('top-calc', 'CSS top: calc(100% - offset)')
        .addOption('dvh', 'CSS top: calc(100dvh - offset)')
        .addOption('svh', 'CSS top: calc(100svh - offset)')
        .addOption('vv-js', 'JS visualViewport.height - offset')
        .addOption('window-js', 'JS window.innerHeight - offset')
        .addOption('bottom-fixed', 'CSS bottom: offset (known bad)')
        .setValue(this.plugin.settings.strategy)
        .onChange(async (value) => {
          this.plugin.settings.strategy = value as Strategy;
          await this.plugin.saveSettings();
          this.plugin.applyStrategy();
        }));

    new Setting(containerEl)
      .setName('Offset when toolbar is visible (px)')
      .setDesc('Used for the minimize button when the native toolbar is showing. Higher = button sits higher above the keyboard (needs to clear the toolbar).')
      .addText(t => t
        .setValue(String(this.plugin.settings.offsetVisible))
        .onChange(async (value) => {
          const n = Number(value);
          if (!isFinite(n)) return;
          this.plugin.settings.offsetVisible = n;
          await this.plugin.saveSettings();
          this.plugin.applyStrategy();
        }));

    new Setting(containerEl)
      .setName('Offset when toolbar is minimized (px)')
      .setDesc('Used for expand + dismiss buttons when the toolbar is hidden. Typically smaller — buttons can sit lower because the toolbar isn\'t there.')
      .addText(t => t
        .setValue(String(this.plugin.settings.offsetHidden))
        .onChange(async (value) => {
          const n = Number(value);
          if (!isFinite(n)) return;
          this.plugin.settings.offsetHidden = n;
          await this.plugin.saveSettings();
          this.plugin.applyStrategy();
        }));
  }
}
