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
var ICON_EXPAND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
var ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
var ICON_DISMISS_KB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="9" rx="2"/><path d="M7 8h.01M10 8h.01M13 8h.01M16 8h.01"/><path d="M6 11h12"/><path d="M8 16l4 4 4-4"/></svg>`;
var DEFAULTS = {
  hidden: false,
  buttonSize: 44,
  yOffsetVisible: 24,
  yOffsetHidden: 10,
  xOffsetVisible: 0,
  xOffsetHidden: 0
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
    this.applyButtonSize();
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
  applyButtonSize() {
    const size = `${this.settings.buttonSize}px`;
    [this.btnMinimize, this.btnExpand, this.btnDismiss].forEach((b) => {
      if (!b)
        return;
      b.style.width = size;
      b.style.height = size;
    });
  }
  applyOffset() {
    if (!this.flexContainer)
      return;
    const y = this.settings.hidden ? this.settings.yOffsetHidden : this.settings.yOffsetVisible;
    const x = this.settings.hidden ? this.settings.xOffsetHidden : this.settings.xOffsetVisible;
    this.flexContainer.style.marginBottom = "0";
    this.flexContainer.style.setProperty("--mt-y-offset", `${y}px`);
    this.flexContainer.style.setProperty("--mt-x-offset", `${x}px`);
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
    this.previewMinimized = false;
    this.previewEl = null;
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
    this.renderNotice(
      containerEl,
      "Beta testing phase",
      "This plugin is early and under active testing. If something doesn't work, please file an issue on GitHub:",
      { text: "Submit an issue", href: ISSUES_URL }
    );
    this.renderNotice(
      containerEl,
      "Device compatibility",
      "Developed and optimized on iPhone 15 Pro. Pixel offsets for the controls may need adjustment on devices with different resolutions or screen sizes \u2014 use the offset fields below and watch the live preview."
    );
    this.renderNotice(
      containerEl,
      "Developers welcome",
      "Making a floating button stick above the software keyboard in Obsidian mobile is surprisingly hard. This plugin uses a flex-sibling injected into .app-container \u2014 it rides Obsidian's natural layout flow. If you know a more reliable technique, please open an issue or PR:",
      { text: "Repo on GitHub", href: REPO_URL }
    );
    containerEl.createEl("h3", { text: "Preview" });
    const stageWrap = containerEl.createEl("div", { cls: "mt-preview-wrap" });
    const stage = stageWrap.createEl("div", { cls: "mt-preview-stage" });
    stage.createEl("div", { cls: "mt-preview-content", text: "Editor content" });
    stage.createEl("div", { cls: "mt-preview-baseline" });
    const fakeToolbar = stage.createEl("div", { cls: "mt-preview-toolbar", text: "native toolbar" });
    const row = stage.createEl("div", { cls: "mt-preview-row" });
    row.innerHTML = `<span class="mt-preview-btn" data-id="expand">${ICON_EXPAND}</span><span class="mt-preview-btn" data-id="minimize">${ICON_MINIMIZE}</span><span class="mt-preview-btn" data-id="dismiss">${ICON_DISMISS_KB}</span>`;
    this.previewEl = stage;
    this.previewEl._fakeToolbar = fakeToolbar;
    this.previewEl._row = row;
    new import_obsidian.Setting(containerEl).setName("Preview state").setDesc("Toggle what the preview shows so you can fine-tune each state separately.").addDropdown((d) => d.addOption("visible", "Toolbar visible (minimize button)").addOption("minimized", "Toolbar minimized (expand + dismiss buttons)").setValue(this.previewMinimized ? "minimized" : "visible").onChange((v) => {
      this.previewMinimized = v === "minimized";
      this.refreshPreview();
    }));
    this.refreshPreview();
    containerEl.createEl("h3", { text: "Button size" });
    new import_obsidian.Setting(containerEl).setName("Button size (px)").setDesc("Width and height of each button. Apple recommends at least 44\xD744 for touch targets.").addText((t) => t.setValue(String(this.plugin.settings.buttonSize)).onChange(async (value) => {
      const n = Number(value);
      if (!isFinite(n) || n < 16)
        return;
      this.plugin.settings.buttonSize = n;
      await this.plugin.saveSettings();
      this.plugin.applyButtonSize();
      this.refreshPreview();
    }));
    containerEl.createEl("h3", { text: "When toolbar is visible" });
    this.offsetField(
      containerEl,
      "Y offset (px)",
      "Lift the minimize button above the native toolbar.",
      () => this.plugin.settings.yOffsetVisible,
      (n) => {
        this.plugin.settings.yOffsetVisible = n;
      }
    );
    this.offsetField(
      containerEl,
      "X offset (px)",
      "Shift left from the right edge. Positive = further from the edge.",
      () => this.plugin.settings.xOffsetVisible,
      (n) => {
        this.plugin.settings.xOffsetVisible = n;
      }
    );
    containerEl.createEl("h3", { text: "When toolbar is minimized" });
    this.offsetField(
      containerEl,
      "Y offset (px)",
      "Lift the expand + dismiss buttons above their resting position.",
      () => this.plugin.settings.yOffsetHidden,
      (n) => {
        this.plugin.settings.yOffsetHidden = n;
      }
    );
    this.offsetField(
      containerEl,
      "X offset (px)",
      "Shift left from the right edge. Positive = further from the edge.",
      () => this.plugin.settings.xOffsetHidden,
      (n) => {
        this.plugin.settings.xOffsetHidden = n;
      }
    );
    const authorBlock = containerEl.createDiv({ cls: "mmet-author-block" });
    const nameDiv = authorBlock.createEl("div", { cls: "mmet-author-name" });
    const nameLink = nameDiv.createEl("a", {
      text: "Leviathan Duck",
      href: "https://github.com/LeviathanDuck"
    });
    nameLink.setAttr("target", "_blank");
    nameLink.setAttr("rel", "noopener");
    authorBlock.createEl("div", {
      cls: "mmet-author-meta",
      text: "Leftcoast Media House Inc."
    });
    const moreDiv = authorBlock.createEl("div", { cls: "mmet-author-meta" });
    const moreLink = moreDiv.createEl("a", {
      text: "More Obsidian plugins & themes",
      href: "https://github.com/LeviathanDuck?tab=repositories"
    });
    moreLink.setAttr("target", "_blank");
    moreLink.setAttr("rel", "noopener");
  }
  offsetField(container, name, desc, get, set) {
    new import_obsidian.Setting(container).setName(name).setDesc(desc).addText((t) => t.setValue(String(get())).onChange(async (value) => {
      const n = Number(value);
      if (!isFinite(n))
        return;
      set(n);
      await this.plugin.saveSettings();
      this.plugin.applyOffset();
      this.refreshPreview();
    }));
  }
  renderNotice(container, title, body, link) {
    const notice = container.createEl("div", { cls: "mt-notice mt-notice-info" });
    notice.createEl("strong", { text: title });
    notice.createEl("p", { text: body });
    if (link) {
      const p = notice.createEl("p");
      p.createEl("a", {
        href: link.href,
        text: link.text,
        attr: { target: "_blank", rel: "noopener noreferrer" }
      });
    }
  }
  refreshPreview() {
    if (!this.previewEl)
      return;
    const stage = this.previewEl;
    const fakeToolbar = stage._fakeToolbar;
    const row = stage._row;
    const minimized = this.previewMinimized;
    const size = this.plugin.settings.buttonSize;
    const y = minimized ? this.plugin.settings.yOffsetHidden : this.plugin.settings.yOffsetVisible;
    const x = minimized ? this.plugin.settings.xOffsetHidden : this.plugin.settings.xOffsetVisible;
    fakeToolbar.style.display = minimized ? "none" : "flex";
    row.style.transform = `translate(${-x}px, ${-y}px)`;
    row.querySelectorAll(".mt-preview-btn").forEach((btn) => {
      btn.style.width = `${size}px`;
      btn.style.height = `${size}px`;
      const id = btn.getAttribute("data-id");
      const show = minimized ? id === "expand" || id === "dismiss" : id === "minimize";
      btn.style.display = show ? "inline-flex" : "none";
    });
  }
};
