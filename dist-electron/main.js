import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
app.disableHardwareAcceleration();
let mainWindow = null;
function getUserDataPath() {
  return app.getPath("userData");
}
function getTeamsDatabasePath() {
  return path.join(getUserDataPath(), "teams.json");
}
function getPokeAPICachePath() {
  return path.join(getUserDataPath(), "pokeapi-cache.json");
}
function getGameDataCachePath() {
  return path.join(getUserDataPath(), "game-data-cache.json");
}
async function getSpriteCacheDir() {
  const dir = path.join(getUserDataPath(), "sprites");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
function getSpriteCacheFilename(remoteUrl) {
  const hash = crypto.createHash("sha1").update(remoteUrl).digest("hex");
  const ext = path.extname(new URL(remoteUrl).pathname) || ".png";
  return `${hash}${ext}`;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: "ChoiceBuds - VGC Team Importer",
    backgroundColor: "#1a1a1a",
    show: false
    // Don't show until ready-to-show event
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function registerIPCHandlers() {
  ipcMain.handle("file:read-teams-database", async () => {
    try {
      const filePath = getTeamsDatabasePath();
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (err) {
      if (err.code === "ENOENT") {
        return null;
      }
      console.error("Error reading teams database:", err);
      throw err;
    }
  });
  ipcMain.handle("file:write-teams-database", async (_event, data) => {
    try {
      const filePath = getTeamsDatabasePath();
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error("Error writing teams database:", err);
      return false;
    }
  });
  ipcMain.handle("file:read-pokeapi-cache", async () => {
    try {
      const filePath = getPokeAPICachePath();
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (err) {
      if (err.code === "ENOENT") {
        return null;
      }
      console.error("Error reading PokeAPI cache:", err);
      throw err;
    }
  });
  ipcMain.handle("file:write-pokeapi-cache", async (_event, data) => {
    try {
      const filePath = getPokeAPICachePath();
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error("Error writing PokeAPI cache:", err);
      return false;
    }
  });
  ipcMain.handle("file:get-userdata-path", async () => {
    return getUserDataPath();
  });
  ipcMain.handle("file:read-game-data-cache", async () => {
    try {
      const filePath = getGameDataCachePath();
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (err) {
      if (err.code === "ENOENT") {
        return null;
      }
      console.error("Error reading game data cache:", err);
      throw err;
    }
  });
  ipcMain.handle("file:write-game-data-cache", async (_event, data) => {
    try {
      const filePath = getGameDataCachePath();
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error("Error writing game data cache:", err);
      return false;
    }
  });
  function fileToDataUrl(filePath, buffer) {
    const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
    return `data:image/${ext};base64,${buffer.toString("base64")}`;
  }
  ipcMain.handle("sprite:get-path", async (_event, remoteUrl) => {
    try {
      const dir = await getSpriteCacheDir();
      const filePath = path.join(dir, getSpriteCacheFilename(remoteUrl));
      const buffer = await fs.readFile(filePath);
      return fileToDataUrl(filePath, buffer);
    } catch {
      return null;
    }
  });
  ipcMain.handle("sprite:download", async (_event, remoteUrl) => {
    try {
      const dir = await getSpriteCacheDir();
      const filePath = path.join(dir, getSpriteCacheFilename(remoteUrl));
      try {
        const cachedBuffer = await fs.readFile(filePath);
        return fileToDataUrl(filePath, cachedBuffer);
      } catch {
      }
      const response = await fetch(remoteUrl);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      return fileToDataUrl(filePath, buffer);
    } catch (err) {
      console.error(`Error downloading sprite from ${remoteUrl}:`, err);
      return null;
    }
  });
}
app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
