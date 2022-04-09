import {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  // nativeImage
} from "electron";
import { join } from "path";
import { parse } from "url";
import { autoUpdater } from "electron-updater";

import { S3Client } from "./s3Client/s3Client";
import logger from "./utils/logger";
import settings from "./utils/settings";

const isProd = process.env.NODE_ENV === "production" || app.isPackaged;

logger.info("App starting...");
settings.set("check", true);
logger.info("Checking if settings store works correctly.");
logger.info(
  settings.get("check")
    ? "Settings store works correctly."
    : "Settings store has a problem."
);
const s3 = new S3Client({ log: logger });

let mainWindow: BrowserWindow | null;
let notification: Notification | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      devTools: isProd ? false : true,
      contextIsolation: true,
    },
  });

  logger.debug(`path ${join(__dirname, "render", "index.html")}`);

  const url =
    // process.env.NODE_ENV === "production"
    isProd
      ? // in production, use the statically build version of our application
        `file://${join(__dirname, "render", "index.html")}`
      : // in dev, target the host and port of the local rollup web server
        "http://localhost:3000";

  mainWindow.loadURL(url).catch((err) => {
    logger.error(JSON.stringify(err));
    app.quit();
  });

  if (!isProd) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", createWindow);

// those two events are completely optional to subscrbe to, but that's a common way to get the
// user experience people expect to have on macOS: do not quit the application directly
// after the user close the last window, instead wait for Command + Q (or equivalent).
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

app.on("web-contents-created", (e, contents) => {
  logger.info(e);
  // Security of webviews
  contents.on("will-attach-webview", (event, webPreferences, params) => {
    logger.info(event, params);
    // Strip away preload scripts if unused or verify their location is legitimate
    delete webPreferences.preload;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;

    // Verify URL being loaded
    // if (!params.src.startsWith(`file://${join(__dirname)}`)) {
    //   event.preventDefault(); // We do not open anything now
    // }
  });

  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedURL = parse(navigationUrl);
    // In dev mode allow Hot Module Replacement
    if (parsedURL.host !== "localhost:3000" && !isProd) {
      logger.warn("Stopped attempt to open: " + navigationUrl);
      event.preventDefault();
    } else if (isProd) {
      logger.warn("Stopped attempt to open: " + navigationUrl);
      event.preventDefault();
    }
  });
});

// Event handler for asynchronous incoming messages
ipcMain.on(
  "create-empty-album",
  (event, arg: { customer: string; name: string }) => {
    console.log(arg);
    s3.createEmptyAlbum(arg).then((response) => {
      // Event emitter for sending asynchronous messages
      event.sender.send("create-empty-album-reply", JSON.stringify(response));
    });
  }
);

ipcMain.on("get-albums", (event, arg) => {
  console.log(arg);
  s3.getAlbums().then((response) => {
    // Event emitter for sending asynchronous messages
    event.sender.send("get-albums-reply", JSON.stringify(response));
  });
});

ipcMain.on(
  "upload-to-album",
  (event, arg: { dir: string; customer: string; name: string }) => {
    console.log(arg);
    s3.uploadFolderToAlbum(
      { customer: arg.customer, name: arg.name },
      arg.dir
    ).then((response) => {
      // Event emitter for sending asynchronous messages
      event.sender.send("upload-to-album-reply", JSON.stringify(response));
    });
  }
);

if (isProd)
  autoUpdater.checkForUpdates().catch((err) => {
    logger.error(JSON.stringify(err));
  });

autoUpdater.logger = logger;

autoUpdater.on("update-available", () => {
  notification = new Notification({
    title: "Fluide",
    body: "Updates are available. Click to download.",
    silent: true,
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
  notification.on("click", () => {
    autoUpdater.downloadUpdate().catch((err) => {
      logger.error(JSON.stringify(err));
    });
  });
});

autoUpdater.on("update-not-available", () => {
  notification = new Notification({
    title: "Fluide",
    body: "Your software is up to date.",
    silent: true,
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
});

autoUpdater.on("update-downloaded", () => {
  notification = new Notification({
    title: "Fluide",
    body: "The updates are ready. Click to quit and install.",
    silent: true,
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
  notification.on("click", () => {
    autoUpdater.quitAndInstall();
  });
});

autoUpdater.on("error", (err) => {
  notification = new Notification({
    title: "Fluide",
    body: JSON.stringify(err),
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
});
