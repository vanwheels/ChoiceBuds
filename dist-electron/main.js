import { app as l, BrowserWindow as E, ipcMain as i } from "electron";
import { fileURLToPath as b } from "url";
import a from "path";
import n from "fs/promises";
import j from "crypto";
const C = b(import.meta.url), u = a.dirname(C);
l.disableHardwareAcceleration();
let c = null;
function h() {
  return l.getPath("userData");
}
function w() {
  return a.join(h(), "teams.json");
}
function p() {
  return a.join(h(), "pokeapi-cache.json");
}
function m() {
  return a.join(h(), "game-data-cache.json");
}
async function g() {
  const o = a.join(h(), "sprites");
  return await n.mkdir(o, { recursive: !0 }), o;
}
function y(o) {
  const e = j.createHash("sha1").update(o).digest("hex"), t = a.extname(new URL(o).pathname) || ".png";
  return `${e}${t}`;
}
function P() {
  c = new E({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: a.join(u, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1
    },
    title: "ChoiceBuds - VGC Team Importer",
    backgroundColor: "#1a1a1a",
    show: !1
    // Don't show until ready-to-show event
  }), c.once("ready-to-show", () => {
    c == null || c.show();
  }), process.env.NODE_ENV === "development" ? c.loadURL("http://localhost:5173") : c.loadFile(a.join(u, "../renderer/index.html")), c.on("closed", () => {
    c = null;
  });
}
function F() {
  i.handle("file:read-teams-database", async () => {
    try {
      const e = w(), t = await n.readFile(e, "utf-8");
      return JSON.parse(t);
    } catch (e) {
      if (e.code === "ENOENT")
        return null;
      throw console.error("Error reading teams database:", e), e;
    }
  }), i.handle("file:write-teams-database", async (e, t) => {
    try {
      const r = w();
      return await n.writeFile(r, JSON.stringify(t, null, 2), "utf-8"), !0;
    } catch (r) {
      return console.error("Error writing teams database:", r), !1;
    }
  }), i.handle("file:read-pokeapi-cache", async () => {
    try {
      const e = p(), t = await n.readFile(e, "utf-8");
      return JSON.parse(t);
    } catch (e) {
      if (e.code === "ENOENT")
        return null;
      throw console.error("Error reading PokeAPI cache:", e), e;
    }
  }), i.handle("file:write-pokeapi-cache", async (e, t) => {
    try {
      const r = p();
      return await n.writeFile(r, JSON.stringify(t, null, 2), "utf-8"), !0;
    } catch (r) {
      return console.error("Error writing PokeAPI cache:", r), !1;
    }
  }), i.handle("file:get-userdata-path", async () => h()), i.handle("file:read-game-data-cache", async () => {
    try {
      const e = m(), t = await n.readFile(e, "utf-8");
      return JSON.parse(t);
    } catch (e) {
      if (e.code === "ENOENT")
        return null;
      throw console.error("Error reading game data cache:", e), e;
    }
  }), i.handle("file:write-game-data-cache", async (e, t) => {
    try {
      const r = m();
      return await n.writeFile(r, JSON.stringify(t, null, 2), "utf-8"), !0;
    } catch (r) {
      return console.error("Error writing game data cache:", r), !1;
    }
  });
  function o(e, t) {
    return `data:image/${a.extname(e).slice(1).toLowerCase() || "png"};base64,${t.toString("base64")}`;
  }
  i.handle("sprite:get-path", async (e, t) => {
    try {
      const r = await g(), s = a.join(r, y(t)), f = await n.readFile(s);
      return o(s, f);
    } catch {
      return null;
    }
  }), i.handle("sprite:download", async (e, t) => {
    try {
      const r = await g(), s = a.join(r, y(t));
      try {
        const N = await n.readFile(s);
        return o(s, N);
      } catch {
      }
      const f = await fetch(t);
      if (!f.ok) return null;
      const d = Buffer.from(await f.arrayBuffer());
      return await n.writeFile(s, d), o(s, d);
    } catch (r) {
      return console.error(`Error downloading sprite from ${t}:`, r), null;
    }
  });
}
l.whenReady().then(() => {
  F(), P(), l.on("activate", () => {
    E.getAllWindows().length === 0 && P();
  });
});
l.on("window-all-closed", () => {
  process.platform !== "darwin" && l.quit();
});
