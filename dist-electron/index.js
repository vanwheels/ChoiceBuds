"use strict";
const { app, BrowserWindow } = require("electron");
const path = require("path");
require("fs");
let mainWindow = null;
function createWindow() {
  const preloadPath = path.join(__dirname, "dist-electron/preload.mjs");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: "ChoiceBuds - VGC Team Importer",
    backgroundColor: "#1a1a1a",
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.loadURL("http://localhost:5173");
  mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
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
