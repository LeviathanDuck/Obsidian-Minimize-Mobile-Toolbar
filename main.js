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
var DEFAULTS = { bottom: 8, right: 16, hidden: false };
var ICON_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
var ICON_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
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
      this.syncVisibility();
    });
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.applyState();
      this.syncVisibility();
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      this.applyState();
      this.syncVisibility();
    }));
  }
  toolbar() {
    return document.querySelector(".mobile-toolbar");
  }
  isEditorActive() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    return view !== null && view.getMode() !== "preview";
  }
  isKeyboardVisible() {
    if (!window.visualViewport)
      return false;
    return window.innerHeight - window.visualViewport.height > 150;
  }
  syncVisibility() {
    if (!this.btn)
      return;
    const show = this.isEditorActive() && this.isKeyboardVisible();
    this.btn.style.display = show ? "flex" : "none";
  }
  createButton() {
    this.btn = document.createElement("div");
    this.btn.addClass("mt-toggle");
    this.btn.style.display = "none";
    this.syncIcon();
    this.syncPosition();
    document.body.appendChild(this.btn);
    this.wireDragAndTap();
    this.wireViewport();
  }
  syncIcon() {
    if (!this.btn)
      return;
    this.btn.innerHTML = this.settings.hidden ? ICON_SHOW : ICON_HIDE;
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
    const handler = () => {
      this.syncPosition();
      this.syncVisibility();
    };
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
    new import_obsidian.Setting(containerEl).setName("Button \u2014 bottom (px)").setDesc("Gap above the keyboard top. Drag the button to reposition.").addText((t) => t.setValue(String(this.plugin.settings.bottom)).onChange(async (v) => {
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
