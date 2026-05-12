import { bootstrapApp } from "./ui/app";

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

bootstrapApp();
registerServiceWorker();
