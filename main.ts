import { App, Plugin, PluginSettingTab, Setting, Platform } from 'obsidian';

const ICON_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
const ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const ICON_DISMISS_KB = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="9" rx="2"/><path d="M7 8h.01M10 8h.01M13 8h.01M16 8h.01"/><path d="M6 11h12"/><path d="M8 16l4 4 4-4"/></svg>`;

interface Settings {
  hidden: boolean;
  offsetVisible: number;
  offsetHidden: number;
}
const DEFAULTS: Settings = {
  hidden: false,
  offsetVisible: 24,
  offsetHidden: 10,
};

const REPO_URL = 'https://github.com/LeviathanDuck/Obsidian-Minimize-Mobile-Toolbar';
const ISSUES_URL = `${REPO_URL}/issues`;

const CLS_HIDDEN = 'mt-hidden';
const CLS_KB_ACTIVE = 'mt-keyboard-active';
const CONTAINER_ID = 'mt-flex-container';

export default class MinimizeToolbarPlugin extends Plugin {
  settings: Settings;
  private btnMinimize: HTMLElement | null = null;
  private btnExpand: HTMLElement | null = null;
  private btnDismiss: HTMLElement | null = null;
  private flexContainer: HTMLElement | null = null;
  private capKbHandles: Array<{ remove: () => void }> = [];

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MTSettingTab(this.app, this));
    if (!Platform.isMobile) return;

    this.app.workspace.onLayoutReady(() => {
      this.createButtons();
      this.applyState();
      this.mountContainer();
      this.wireKeyboardDetection();
    });

    this.registerEvent(this.app.workspace.on('layout-change', () => {
      this.applyState();
      this.ensureMounted();
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.applyState();
      this.ensureMounted();
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
    this.registerDomEvent(el, 'pointerup', onTap);
    this.register(() => el.remove());
    return el;
  }

  private mountContainer() {
    const appContainer = document.querySelector('.app-container') as HTMLElement | null;
    if (!appContainer) return;

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.addClass('mt-flex-container');
    this.flexContainer = container;

    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach(b => {
      if (b) container.appendChild(b);
    });

    const toolbar = document.querySelector('.mobile-toolbar');
    const navbar = document.querySelector('.mobile-navbar');
    if (toolbar && toolbar.parentElement === appContainer) {
      appContainer.insertBefore(container, toolbar);
    } else if (navbar && navbar.parentElement === appContainer) {
      appContainer.insertBefore(container, navbar);
    } else {
      appContainer.appendChild(container);
    }

    this.applyOffset();
  }

  private ensureMounted() {
    if (!this.flexContainer || !document.body.contains(this.flexContainer)) {
      this.flexContainer?.remove();
      this.flexContainer = null;
      this.mountContainer();
    }
  }

  private applyOffset() {
    if (!this.flexContainer) return;
    const offset = this.settings.hidden ? this.settings.offsetHidden : this.settings.offsetVisible;
    // Keep the container in flex flow with zero margin — the visual lift is done
    // via translateY on the buttons, so no gap in the layout shows bg color.
    this.flexContainer.style.marginBottom = '0';
    this.flexContainer.style.setProperty('--mt-offset', `${offset}px`);
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
    this.applyOffset();
  }

  setHidden(hidden: boolean) {
    this.settings.hidden = hidden;
    this.applyState();
    this.saveSettings();
  }

  onunload() {
    document.body.removeClass(CLS_HIDDEN);
    document.body.removeClass(CLS_KB_ACTIVE);
    this.flexContainer?.remove();
    this.flexContainer = null;
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

    // Mobile-only notice
    if (!Platform.isMobile) {
      const note = containerEl.createEl('div', { cls: 'mt-notice mt-notice-warn' });
      note.createEl('strong', { text: 'This plugin is mobile-only.' });
      note.createEl('p', {
        text: 'It has no effect on desktop — the native Obsidian toolbar this plugin targets only exists on mobile.',
      });
      return;
    }

    // Beta notice
    const beta = containerEl.createEl('div', { cls: 'mt-notice mt-notice-info' });
    beta.createEl('strong', { text: 'Beta testing phase' });
    beta.createEl('p', {
      text: 'This plugin is early and under active testing. If something doesn\'t work, please file an issue on GitHub:',
    });
    const betaLinkP = beta.createEl('p');
    betaLinkP.createEl('a', {
      href: ISSUES_URL,
      text: 'Submit an issue',
      attr: { target: '_blank', rel: 'noopener noreferrer' },
    });

    // Device note
    const dev = containerEl.createEl('div', { cls: 'mt-notice mt-notice-info' });
    dev.createEl('strong', { text: 'Device compatibility' });
    dev.createEl('p', {
      text: 'Developed and optimized on iPhone 15 Pro. Pixel offsets for the controls may need adjustment on devices with different resolutions or screen sizes — use the two offset fields below to fine-tune.',
    });

    // Dev brainstorm
    const brainstorm = containerEl.createEl('div', { cls: 'mt-notice mt-notice-info' });
    brainstorm.createEl('strong', { text: 'Developers welcome' });
    brainstorm.createEl('p', {
      text: 'Making a floating button stick above the software keyboard in Obsidian mobile is surprisingly hard. This plugin uses a flex-sibling injected into .app-container — it rides Obsidian\'s natural layout flow. If you know a more reliable technique, please open an issue or PR:',
    });
    const bsLinkP = brainstorm.createEl('p');
    bsLinkP.createEl('a', {
      href: REPO_URL,
      text: 'Repo on GitHub',
      attr: { target: '_blank', rel: 'noopener noreferrer' },
    });

    // Settings divider
    containerEl.createEl('h3', { text: 'Button position' });

    new Setting(containerEl)
      .setName('Offset when toolbar is visible (px)')
      .setDesc('Distance the minimize button sits above the native toolbar.')
      .addText(t => t
        .setValue(String(this.plugin.settings.offsetVisible))
        .onChange(async (value) => {
          const n = Number(value);
          if (!isFinite(n)) return;
          this.plugin.settings.offsetVisible = n;
          await this.plugin.saveSettings();
          (this.plugin as any).applyOffset();
        }));

    new Setting(containerEl)
      .setName('Offset when toolbar is minimized (px)')
      .setDesc('Distance the expand + dismiss buttons sit above their resting position.')
      .addText(t => t
        .setValue(String(this.plugin.settings.offsetHidden))
        .onChange(async (value) => {
          const n = Number(value);
          if (!isFinite(n)) return;
          this.plugin.settings.offsetHidden = n;
          await this.plugin.saveSettings();
          (this.plugin as any).applyOffset();
        }));
  }
}
