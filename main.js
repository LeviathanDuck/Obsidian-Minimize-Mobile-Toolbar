var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MinimizeToolbarPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var ICON_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
var ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
var ICON_DISMISS_KB = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="9" rx="2"/><path d="M7 8h.01M10 8h.01M13 8h.01M16 8h.01"/><path d="M6 11h12"/><path d="M8 16l4 4 4-4"/></svg>`;
var DEFAULTS = {
  hidden: false,
  offsetVisible: 24,
  offsetHidden: 10
};
var REPO_URL = "https://github.com/LeviathanDuck/Obsidian-Minimize-Mobile-Toolbar";
var ISSUES_URL = `${REPO_URL}/issues`;
var CLS_HIDDEN = "mt-hidden";
var CLS_KB_ACTIVE = "mt-keyboard-active";
var CONTAINER_ID = "mt-flex-container";
var MinimizeToolbarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.btnMinimize = null;
    this.btnExpand = null;
    this.btnDismiss = null;
    this.flexContainer = null;
    this.capKbHandles = [];
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MTSettingTab(this.app, this));
    if (!import_obsidian.Platform.isMobile)
      return;
    this.app.workspace.onLayoutReady(() => {
      this.createButtons();
      this.applyState();
      this.mountContainer();
      this.wireKeyboardDetection();
    });
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.applyState();
      this.ensureMounted();
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      this.applyState();
      this.ensureMounted();
    }));
  }
  createButtons() {
    this.btnMinimize = this.makeButton("mt-minimize", ICON_MINIMIZE, () => this.setHidden(true));
    this.btnExpand = this.makeButton("mt-expand", ICON_EXPAND, () => this.setHidden(false));
    this.btnDismiss = this.makeButton("mt-dismiss", ICON_DISMISS_KB, () => this.dismissKeyboard());
  }
  makeButton(id, icon, onTap) {
    const el = document.createElement("div");
    el.id = id;
    el.addClass("mt-btn");
    el.innerHTML = icon;
    el.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    this.registerDomEvent(el, "pointerup", onTap);
    this.register(() => el.remove());
    return el;
  }
  mountContainer() {
    const appContainer = document.querySelector(".app-container");
    if (!appContainer)
      return;
    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.addClass("mt-flex-container");
    this.flexContainer = container;
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
      if (b)
        container.appendChild(b);
    });
    const toolbar = document.querySelector(".mobile-toolbar");
    const navbar = document.querySelector(".mobile-navbar");
    if (toolbar && toolbar.parentElement === appContainer) {
      appContainer.insertBefore(container, toolbar);
    } else if (navbar && navbar.parentElement === appContainer) {
      appContainer.insertBefore(container, navbar);
    } else {
      appContainer.appendChild(container);
    }
    this.applyOffset();
  }
  ensureMounted() {
    var _a;
    if (!this.flexContainer || !document.body.contains(this.flexContainer)) {
      (_a = this.flexContainer) == null ? void 0 : _a.remove();
      this.flexContainer = null;
      this.mountContainer();
    }
  }
  applyOffset() {
    if (!this.flexContainer)
      return;
    const offset = this.settings.hidden ? this.settings.offsetHidden : this.settings.offsetVisible;
    this.flexContainer.style.marginBottom = "0";
    this.flexContainer.style.setProperty("--mt-offset", `${offset}px`);
  }
  wireKeyboardDetection() {
    var _a, _b;
    const kb = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.Keyboard;
    if (kb == null ? void 0 : kb.addListener) {
      this.capKbHandles.push(kb.addListener("keyboardWillShow", () => this.setKb(true)));
      this.capKbHandles.push(kb.addListener("keyboardWillHide", () => this.setKb(false)));
      this.register(() => {
        this.capKbHandles.forEach((h) => {
          var _a2;
          return (_a2 = h.remove) == null ? void 0 : _a2.call(h);
        });
        this.capKbHandles = [];
      });
      return;
    }
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const check = () => this.setKb(window.innerHeight - vv.height > 150);
      vv.addEventListener("resize", check);
      this.register(() => vv.removeEventListener("resize", check));
    }
  }
  setKb(active) {
    document.body.toggleClass(CLS_KB_ACTIVE, active);
  }
  dismissKeyboard() {
    var _a, _b, _c;
    const kb = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.Keyboard;
    if (kb == null ? void 0 : kb.hide) {
      kb.hide();
      return;
    }
    (_c = document.activeElement) == null ? void 0 : _c.blur();
  }
  applyState() {
    document.body.toggleClass(CLS_HIDDEN, this.settings.hidden);
    this.applyOffset();
  }
  setHidden(hidden) {
    this.settings.hidden = hidden;
    this.applyState();
    this.saveSettings();
  }
  onunload() {
    var _a;
    document.body.removeClass(CLS_HIDDEN);
    document.body.removeClass(CLS_KB_ACTIVE);
    (_a = this.flexContainer) == null ? void 0 : _a.remove();
    this.flexContainer = null;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var MTSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    if (!import_obsidian.Platform.isMobile) {
      const note = containerEl.createEl("div", { cls: "mt-notice mt-notice-warn" });
      note.createEl("strong", { text: "This plugin is mobile-only." });
      note.createEl("p", {
        text: "It has no effect on desktop \u2014 the native Obsidian toolbar this plugin targets only exists on mobile."
      });
      return;
    }
    const beta = containerEl.createEl("div", { cls: "mt-notice mt-notice-info" });
    beta.createEl("strong", { text: "Beta testing phase" });
    beta.createEl("p", {
      text: "This plugin is early and under active testing. If something doesn't work, please file an issue on GitHub:"
    });
    const betaLinkP = beta.createEl("p");
    betaLinkP.createEl("a", {
      href: ISSUES_URL,
      text: "Submit an issue",
      attr: { target: "_blank", rel: "noopener noreferrer" }
    });
    const dev = containerEl.createEl("div", { cls: "mt-notice mt-notice-info" });
    dev.createEl("strong", { text: "Device compatibility" });
    dev.createEl("p", {
      text: "Developed and optimized on iPhone 15 Pro. Pixel offsets for the controls may need adjustment on devices with different resolutions or screen sizes \u2014 use the two offset fields below to fine-tune."
    });
    const brainstorm = containerEl.createEl("div", { cls: "mt-notice mt-notice-info" });
    brainstorm.createEl("strong", { text: "Developers welcome" });
    brainstorm.createEl("p", {
      text: "Making a floating button stick above the software keyboard in Obsidian mobile is surprisingly hard. This plugin uses a flex-sibling injected into .app-container \u2014 it rides Obsidian's natural layout flow. If you know a more reliable technique, please open an issue or PR:"
    });
    const bsLinkP = brainstorm.createEl("p");
    bsLinkP.createEl("a", {
      href: REPO_URL,
      text: "Repo on GitHub",
      attr: { target: "_blank", rel: "noopener noreferrer" }
    });
    containerEl.createEl("h3", { text: "Button position" });
    new import_obsidian.Setting(containerEl).setName("Offset when toolbar is visible (px)").setDesc("Distance the minimize button sits above the native toolbar.").addText((t) => t.setValue(String(this.plugin.settings.offsetVisible)).onChange(async (value) => {
      const n = Number(value);
      if (!isFinite(n))
        return;
      this.plugin.settings.offsetVisible = n;
      await this.plugin.saveSettings();
      this.plugin.applyOffset();
    }));
    new import_obsidian.Setting(containerEl).setName("Offset when toolbar is minimized (px)").setDesc("Distance the expand + dismiss buttons sit above their resting position.").addText((t) => t.setValue(String(this.plugin.settings.offsetHidden)).onChange(async (value) => {
      const n = Number(value);
      if (!isFinite(n))
        return;
      this.plugin.settings.offsetHidden = n;
      await this.plugin.saveSettings();
      this.plugin.applyOffset();
    }));
  }
};
