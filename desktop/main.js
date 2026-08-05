const { app, BrowserWindow, shell, session } = require("electron");

// O app de Mac abre o Memorai já publicado, numa janela nativa.
const APP_URL = "https://memorai-6zjw.onrender.com";
// UA de Chrome real — aumenta a chance do login Google funcionar dentro do app.
const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "Memorai",
    backgroundColor: "#0E1014",
    webPreferences: { contextIsolation: true },
  });

  win.webContents.setUserAgent(CHROME_UA);
  win.loadURL(APP_URL, { userAgent: CHROME_UA });

  // Links externos (ex.: Google Meet) abrem no navegador padrão.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(() => {
  session.defaultSession.setUserAgent(CHROME_UA);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
