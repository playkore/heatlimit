import { Application } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { WorldMap } from "./data";
import { installTapRecognizer } from "./world-input";
import { WorldRenderer } from "./world-renderer";

export interface PixiWorld {
  destroy(): void;
  setMap(map: WorldMap): void;
  updateMap(map: WorldMap): void;
  resize(): void;
  highlightBuilding(buildingId: string | null, durationMs?: number): void;
}

export async function createPixiWorld(options: {
  container: HTMLElement;
  map: WorldMap;
  onBuildingTap?: (buildingId: string) => void;
  onWorldTap?: (point: { x: number; y: number }) => void;
}): Promise<PixiWorld> {
  let currentMap = options.map;
  const app = new Application();
  await app.init({
    resizeTo: options.container,
    backgroundAlpha: 0,
    antialias: false,
    resolution: Math.max(1, window.devicePixelRatio || 1),
    autoDensity: true,
  });

  const viewport = new Viewport({
    screenWidth: options.container.clientWidth || 1,
    screenHeight: options.container.clientHeight || 1,
    worldWidth: currentMap.width * currentMap.tileSize,
    worldHeight: currentMap.height * currentMap.tileSize,
    events: app.renderer.events,
    threshold: 10,
  });

  viewport.drag().decelerate().clamp({
    left: 0,
    top: 0,
    right: currentMap.width * currentMap.tileSize,
    bottom: currentMap.height * currentMap.tileSize,
  });
  viewport.eventMode = "static";
  viewport.hitArea = app.screen;

  app.stage.addChild(viewport);
  options.container.appendChild(app.canvas);
  app.canvas.style.display = "block";
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";
  app.canvas.style.imageRendering = "pixelated";

  const renderer = new WorldRenderer(app, viewport, {
    app,
    viewport,
    onBuildingTap: options.onBuildingTap,
  });
  renderer.syncMap(options.map);
  renderer.resize();

  const removeWorldTap = installTapRecognizer(viewport, {
    threshold: 10,
    onTap: (event) => {
      if (event.target !== viewport || !options.onWorldTap) {
        return;
      }

      const worldPoint = viewport.toWorld(event.global);
      options.onWorldTap({
        x: Math.floor(worldPoint.x / currentMap.tileSize),
        y: Math.floor(worldPoint.y / currentMap.tileSize),
      });
    },
  });

  const resizeObserver = new ResizeObserver(() => {
    app.resize();
    viewport.hitArea = app.screen;
    renderer.resize();
  });
  resizeObserver.observe(options.container);

  return {
    destroy(): void {
      resizeObserver.disconnect();
      removeWorldTap();
      renderer.destroy();
      app.destroy(true, true);
    },
    setMap(map: WorldMap): void {
      currentMap = map;
      renderer.syncMap(map);
    },
    updateMap(map: WorldMap): void {
      currentMap = map;
      renderer.syncMap(map);
    },
    resize(): void {
      app.resize();
      viewport.hitArea = app.screen;
      renderer.resize();
    },
    highlightBuilding(buildingId: string | null, durationMs?: number): void {
      renderer.highlightBuilding(buildingId, durationMs);
    },
  };
}
