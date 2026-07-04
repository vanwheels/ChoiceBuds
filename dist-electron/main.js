import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
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
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
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
