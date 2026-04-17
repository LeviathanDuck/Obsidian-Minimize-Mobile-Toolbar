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
var DEFAULTS = { bottom: 80, right: 16, hidden: false };
var MinimizeToolbarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.btn = null;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));
    if (!import_obsidian.Platform.isMobile)
      return;
    this.app.workspace.onLayoutReady(() => {
      this.createButton();
      this.applyState();
    });
    this.registerEvent(this.app.workspace.on("layout-change", () => this.applyState()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.applyState()));
  }
  toolbar() {
    return document.querySelector(".mobile-toolbar");
  }
  createButton() {
    this.btn = document.createElement("div");
    this.btn.addClass("mt-toggle");
    this.syncIcon();
    this.syncPosition();
    document.body.appendChild(this.btn);
    this.wireDragAndTap();
    this.wireViewport();
  }
  syncIcon() {
    var _a;
    (_a = this.btn) == null ? void 0 : _a.setText(this.settings.hidden ? "\u25B2" : "\u25BC");
  }
  syncPosition() {
    if (!this.btn)
      return;
    const vv = window.visualViewport;
    const kbHeight = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    const bottom = this.settings.bottom + kbHeight;
    this.btn.style.bottom = `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`;
    this.btn.style.right = `calc(${this.settings.right}px + env(safe-area-inset-right, 0px))`;
  }
  wireViewport() {
    if (!window.visualViewport)
      return;
    const handler = () => this.syncPosition();
    window.visualViewport.addEventListener("resize", handler);
    window.visualViewport.addEventListener("scroll", handler);
    this.register(() => {
      var _a, _b;
      (_a = window.visualViewport) == null ? void 0 : _a.removeEventListener("resize", handler);
      (_b = window.visualViewport) == null ? void 0 : _b.removeEventListener("scroll", handler);
    });
  }
  wireDragAndTap() {
    if (!this.btn)
      return;
    let moved = false, sx = 0, sy = 0, sr = 0, sb = 0;
    this.registerDomEvent(this.btn, "pointerdown", (e) => {
      moved = false;
      sx = e.clientX;
      sy = e.clientY;
      sr = this.settings.right;
      sb = this.settings.bottom;
      e.target.setPointerCapture(e.pointerId);
    });
    this.registerDomEvent(this.btn, "pointermove", (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        moved = true;
        this.settings.right = Math.max(0, sr - dx);
        this.settings.bottom = Math.max(0, sb - dy);
        this.syncPosition();
      }
    });
    this.registerDomEvent(this.btn, "pointerup", async () => {
      if (!moved)
        this.toggle();
      await this.saveSettings();
    });
  }
  applyState() {
    const t = this.toolbar();
    if (t)
      t.style.display = this.settings.hidden ? "none" : "";
  }
  toggle() {
    this.settings.hidden = !this.settings.hidden;
    this.applyState();
    this.syncIcon();
    this.saveSettings();
  }
  onunload() {
    var _a;
    (_a = this.btn) == null ? void 0 : _a.remove();
    const t = this.toolbar();
    if (t)
      t.style.display = "";
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var SettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Button \u2014 bottom (px)").setDesc("Gap above the keyboard (or screen bottom when keyboard is hidden). Drag the button to reposition.").addText((t) => t.setValue(String(this.plugin.settings.bottom)).onChange(async (v) => {
      this.plugin.settings.bottom = Number(v) || DEFAULTS.bottom;
      this.plugin.syncPosition();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Button \u2014 right (px)").setDesc("Distance from right edge of screen.").addText((t) => t.setValue(String(this.plugin.settings.right)).onChange(async (v) => {
      this.plugin.settings.right = Number(v) || DEFAULTS.right;
      this.plugin.syncPosition();
      await this.plugin.saveSettings();
    }));
  }
};
