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
  strategy: "flex-sibling",
  offsetVisible: 120,
  offsetHidden: 60
};
var STRATEGY_CLASSES = [
  "mt-pos-flex-sibling",
  "mt-pos-center",
  "mt-pos-top-calc",
  "mt-pos-dvh",
  "mt-pos-svh",
  "mt-pos-vv-js",
  "mt-pos-window-js",
  "mt-pos-bottom-fixed"
];
var CLS_HIDDEN = "mt-hidden";
var CLS_KB_ACTIVE = "mt-keyboard-active";
var CLS_ACTIVE = "mt-active";
var CONTAINER_ID = "mt-flex-container";
var MinimizeToolbarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.btnMinimize = null;
    this.btnExpand = null;
    this.btnDismiss = null;
    this.flexContainer = null;
    this.capKbHandles = [];
    this.strategyTeardown = null;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MTSettingTab(this.app, this));
    if (!import_obsidian.Platform.isMobile)
      return;
    this.app.workspace.onLayoutReady(() => {
      document.body.addClass(CLS_ACTIVE);
      this.createButtons();
      this.applyState();
      this.applyStrategy();
      this.wireKeyboardDetection();
    });
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.applyState();
      this.reapplyFlexSiblingIfNeeded();
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      this.applyState();
      this.reapplyFlexSiblingIfNeeded();
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
    document.body.appendChild(el);
    this.registerDomEvent(el, "pointerup", onTap);
    this.register(() => el.remove());
    return el;
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
    this.applyStrategy();
  }
  setHidden(hidden) {
    this.settings.hidden = hidden;
    this.applyState();
    this.saveSettings();
  }
  currentOffset() {
    return this.settings.hidden ? this.settings.offsetHidden : this.settings.offsetVisible;
  }
  applyStrategy() {
    var _a;
    (_a = this.strategyTeardown) == null ? void 0 : _a.call(this);
    this.strategyTeardown = null;
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
      if (b) {
        b.style.top = "";
        b.style.bottom = "";
        b.style.transform = "";
      }
    });
    STRATEGY_CLASSES.forEach((c) => document.body.removeClass(c));
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
      if (b && b.parentElement !== document.body)
        document.body.appendChild(b);
    });
    if (this.flexContainer) {
      this.flexContainer.remove();
      this.flexContainer = null;
    }
    document.body.addClass(`mt-pos-${this.settings.strategy}`);
    switch (this.settings.strategy) {
      case "flex-sibling":
        this.setupFlexSibling();
        break;
      case "vv-js":
        this.setupVvJs();
        break;
      case "window-js":
        this.setupWindowJs();
        break;
      case "top-calc":
        this.setInlineTop(`calc(100% - ${this.currentOffset()}px)`);
        break;
      case "dvh":
        this.setInlineTop(`calc(100dvh - ${this.currentOffset()}px)`);
        break;
      case "svh":
        this.setInlineTop(`calc(100svh - ${this.currentOffset()}px)`);
        break;
      case "bottom-fixed":
        this.setInlineBottom(`${this.currentOffset()}px`);
        break;
      case "center":
        break;
    }
  }
  setInlineTop(val) {
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
      if (b)
        b.style.top = val;
    });
  }
  setInlineBottom(val) {
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
      if (b)
        b.style.bottom = val;
    });
  }
  setupFlexSibling() {
    const appContainer = document.querySelector(".app-container");
    if (!appContainer)
      return;
    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.addClass("mt-flex-container");
    container.style.marginBottom = `${this.currentOffset()}px`;
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
    this.strategyTeardown = () => {
      [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
        if (b)
          document.body.appendChild(b);
      });
      container.remove();
      if (this.flexContainer === container)
        this.flexContainer = null;
    };
  }
  reapplyFlexSiblingIfNeeded() {
    if (this.settings.strategy !== "flex-sibling")
      return;
    if (!this.flexContainer || !document.body.contains(this.flexContainer)) {
      this.applyStrategy();
    }
  }
  setupVvJs() {
    if (!window.visualViewport)
      return;
    const vv = window.visualViewport;
    const update = () => {
      const top = vv.offsetTop + vv.height - this.currentOffset();
      this.setInlineTop(`${top}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    this.strategyTeardown = () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }
  setupWindowJs() {
    const update = () => {
      const top = window.innerHeight - this.currentOffset();
      this.setInlineTop(`${top}px`);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    this.strategyTeardown = () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }
  onunload() {
    var _a;
    (_a = this.strategyTeardown) == null ? void 0 : _a.call(this);
    STRATEGY_CLASSES.forEach((c) => document.body.removeClass(c));
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
};
var MTSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Button position strategy").setDesc("Flex-sibling is the default \u2014 it mimics gay-toolbar by inserting a container into .app-container, so Obsidian handles the keyboard-aware positioning. The rest are alternates to test if flex-sibling misbehaves.").addDropdown((d) => d.addOption("flex-sibling", "Flex sibling in .app-container (gay-toolbar style, default)").addOption("center", "Center of screen (baseline)").addOption("top-calc", "CSS top: calc(100% - offset)").addOption("dvh", "CSS top: calc(100dvh - offset)").addOption("svh", "CSS top: calc(100svh - offset)").addOption("vv-js", "JS visualViewport.height - offset").addOption("window-js", "JS window.innerHeight - offset").addOption("bottom-fixed", "CSS bottom: offset (known bad)").setValue(this.plugin.settings.strategy).onChange(async (value) => {
      this.plugin.settings.strategy = value;
      await this.plugin.saveSettings();
      this.plugin.applyStrategy();
    }));
    new import_obsidian.Setting(containerEl).setName("Offset when toolbar is visible (px)").setDesc("Used for the minimize button when the native toolbar is showing. Higher = button sits higher above the keyboard (needs to clear the toolbar).").addText((t) => t.setValue(String(this.plugin.settings.offsetVisible)).onChange(async (value) => {
      const n = Number(value);
      if (!isFinite(n))
        return;
      this.plugin.settings.offsetVisible = n;
      await this.plugin.saveSettings();
      this.plugin.applyStrategy();
    }));
    new import_obsidian.Setting(containerEl).setName("Offset when toolbar is minimized (px)").setDesc("Used for expand + dismiss buttons when the toolbar is hidden. Typically smaller \u2014 buttons can sit lower because the toolbar isn't there.").addText((t) => t.setValue(String(this.plugin.settings.offsetHidden)).onChange(async (value) => {
      const n = Number(value);
      if (!isFinite(n))
        return;
      this.plugin.settings.offsetHidden = n;
      await this.plugin.saveSettings();
      this.plugin.applyStrategy();
    }));
  }
};
