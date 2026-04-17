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
var ICON_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5-5 5 5"/><path d="M7 18l5-5 5 5"/><path d="M4 20h16"/></svg>`;
var ICON_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
var DEFAULTS = { hidden: false };
var MinimizeToolbarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.btn = null;
  }
  async onload() {
    await this.loadSettings();
    if (!import_obsidian.Platform.isMobile)
      return;
    this.app.workspace.onLayoutReady(() => {
      this.createButton();
      this.applyState();
    });
    this.registerEvent(this.app.workspace.on("layout-change", () => this.applyState()));
  }
  toolbar() {
    return document.querySelector(".mobile-toolbar");
  }
  createButton() {
    this.btn = document.createElement("div");
    this.btn.addClass("mt-toggle");
    this.syncIcon();
    this.btn.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    document.body.appendChild(this.btn);
    this.registerDomEvent(this.btn, "pointerup", () => this.toggle());
  }
  syncIcon() {
    if (!this.btn)
      return;
    this.btn.innerHTML = this.settings.hidden ? ICON_SHOW : ICON_HIDE;
  }
  applyState() {
    const t = this.toolbar();
    if (!t)
      return;
    if (this.settings.hidden) {
      t.style.height = "0";
      t.style.minHeight = "0";
      t.style.overflow = "hidden";
      t.style.padding = "0";
    } else {
      t.style.height = "";
      t.style.minHeight = "";
      t.style.overflow = "";
      t.style.padding = "";
    }
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
    if (t) {
      t.style.height = "";
      t.style.minHeight = "";
      t.style.overflow = "";
      t.style.padding = "";
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
