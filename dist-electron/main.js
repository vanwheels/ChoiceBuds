import { app as o, BrowserWindow as u, ipcMain as n } from "electron";
import { fileURLToPath as m } from "url";
import i from "path";
import l from "fs/promises";
const p = m(import.meta.url), c = i.dirname(p);
let t = null;
function s() {
  return o.getPath("userData");
}
function h() {
  return i.join(s(), "teams.json");
}
function d() {
  return i.join(s(), "pokeapi-cache.json");
}
function f() {
  t = new u({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: i.join(c, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    },
    title: "ChoiceBuds - VGC Team Importer",
    backgroundColor: "#1a1a1a",
    show: !1
    // Don't show until ready-to-show event
  }), t.once("ready-to-show", () => {
    t == null || t.show();
  }), process.env.NODE_ENV === "development" ? t.loadURL("http://localhost:5173") : t.loadFile(i.join(c, "../renderer/index.html")), t.on("closed", () => {
    t = null;
  });
}
function w() {
  n.handle("file:read-teams-database", async () => {
    try {
      const e = h(), r = await l.readFile(e, "utf-8");
      return JSON.parse(r);
    } catch (e) {
      if (e.code === "ENOENT")
        return null;
      throw console.error("Error reading teams database:", e), e;
    }
  }), n.handle("file:write-teams-database", async (e, r) => {
    try {
      const a = h();
      return await l.writeFile(a, JSON.stringify(r, null, 2), "utf-8"), !0;
    } catch (a) {
      return console.error("Error writing teams database:", a), !1;
    }
  }), n.handle("file:read-pokeapi-cache", async () => {
    try {
      const e = d(), r = await l.readFile(e, "utf-8");
      return JSON.parse(r);
    } catch (e) {
      if (e.code === "ENOENT")
        return null;
      throw console.error("Error reading PokeAPI cache:", e), e;
    }
  }), n.handle("file:write-pokeapi-cache", async (e, r) => {
    try {
      const a = d();
      return await l.writeFile(a, JSON.stringify(r, null, 2), "utf-8"), !0;
    } catch (a) {
      return console.error("Error writing PokeAPI cache:", a), !1;
    }
  }), n.handle("file:get-userdata-path", async () => s());
}
o.whenReady().then(() => {
  w(), f(), o.on("activate", () => {
    u.getAllWindows().length === 0 && f();
  });
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
