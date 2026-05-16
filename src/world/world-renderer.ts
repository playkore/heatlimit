import { Container, Graphics, Sprite, Texture, type Application } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { BuildingInstance, BuildingState, BuildingType, TileId, WorldMap } from "./data";
import { BUILDING_TYPES, TILE_IDS } from "./data";
import { installTapRecognizer } from "./world-input";

interface WorldRendererOptions {
  app: Application;
  viewport: Viewport;
  onBuildingTap?: (buildingId: string) => void;
}

type EffectKind = "repair" | "ruin";

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
}

export class WorldRenderer {
  private readonly tileLayer = new Container();
  private readonly buildingLayer = new Container();
  private readonly effectLayer = new Container();
  private readonly selectionRing = new Graphics();
  private readonly tileTextures = new Map<TileId, Texture>();
  private readonly buildingTextures = new Map<string, Texture>();
  private readonly tileSprites: Sprite[] = [];
  private readonly buildingSprites = new Map<string, Sprite>();
  private readonly spriteTapCleanup = new Map<string, () => void>();
  private readonly particles: Particle[] = [];
  private readonly tick = (ticker: { deltaMS: number }): void => {
    this.updateParticles(ticker.deltaMS);
  };

  private map: WorldMap | null = null;
  private selectedBuildingId: string | null = null;
  private selectedBuildingUntil = 0;

  constructor(
    private readonly app: Application,
    private readonly viewport: Viewport,
    private readonly options: WorldRendererOptions,
  ) {
    this.viewport.addChild(this.tileLayer, this.buildingLayer, this.effectLayer);
    this.effectLayer.addChild(this.selectionRing);
    this.selectionRing.visible = false;
    this.app.ticker.add(this.tick);
  }

  syncMap(map: WorldMap): void {
    const previousMap = this.map;
    const shouldRebuild = !this.map || this.map.width !== map.width || this.map.height !== map.height || this.map.tileSize !== map.tileSize;
    this.map = {
      width: map.width,
      height: map.height,
      tileSize: map.tileSize,
      tiles: [...map.tiles],
      buildings: map.buildings.map((building) => ({ ...building })),
    };

    if (shouldRebuild) {
      this.rebuildTextures(map);
      this.rebuildTiles(map);
      this.rebuildBuildings(map);
      this.updateViewportBounds(map);
      this.updateSelectionRing();
      return;
    }

    this.syncTiles(map);
    this.syncBuildings(map, previousMap);
    this.updateViewportBounds(map);
    this.updateSelectionRing();
  }

  highlightBuilding(buildingId: string | null, durationMs = 650): void {
    this.selectedBuildingId = buildingId;
    this.selectedBuildingUntil = buildingId ? performance.now() + durationMs : 0;
    this.updateSelectionRing();
  }

  resize(): void {
    if (!this.map) {
      return;
    }

    this.viewport.resize(this.app.screen.width, this.app.screen.height, this.map.width * this.map.tileSize, this.map.height * this.map.tileSize);
    this.updateViewportBounds(this.map);
    this.updateSelectionRing();
  }

  destroy(): void {
    this.app.ticker.remove(this.tick);

    for (const cleanup of this.spriteTapCleanup.values()) {
      cleanup();
    }
    this.spriteTapCleanup.clear();

    this.viewport.removeChild(this.tileLayer);
    this.viewport.removeChild(this.buildingLayer);
    this.viewport.removeChild(this.effectLayer);

    this.tileLayer.destroy({ children: true });
    this.buildingLayer.destroy({ children: true });
    this.effectLayer.destroy({ children: true });

    for (const texture of this.tileTextures.values()) {
      texture.destroy(true);
    }
    for (const texture of this.buildingTextures.values()) {
      texture.destroy(true);
    }

    this.tileTextures.clear();
    this.buildingTextures.clear();
    this.tileSprites.length = 0;
    this.buildingSprites.clear();
    this.particles.length = 0;
  }

  private rebuildTextures(map: WorldMap): void {
    for (const texture of this.tileTextures.values()) {
      texture.destroy(true);
    }
    for (const texture of this.buildingTextures.values()) {
      texture.destroy(true);
    }

    this.tileTextures.clear();
    this.buildingTextures.clear();

    for (const tileId of TILE_IDS) {
      this.tileTextures.set(tileId, this.createTileTexture(map.tileSize, tileId));
    }

    for (const buildingType of BUILDING_TYPES) {
      this.buildingTextures.set(`${buildingType}:ruined`, this.createBuildingTexture(map.tileSize, buildingType, "ruined"));
      this.buildingTextures.set(`${buildingType}:repaired`, this.createBuildingTexture(map.tileSize, buildingType, "repaired"));
    }
  }

  private rebuildTiles(map: WorldMap): void {
    this.tileLayer.removeChildren();
    this.tileSprites.length = 0;

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const sprite = new Sprite(this.getTileTexture(map.tiles[y * map.width + x] ?? "grass"));
        sprite.position.set(x * map.tileSize, y * map.tileSize);
        sprite.width = map.tileSize;
        sprite.height = map.tileSize;
        this.tileLayer.addChild(sprite);
        this.tileSprites.push(sprite);
      }
    }
  }

  private syncTiles(map: WorldMap): void {
    if (this.tileSprites.length !== map.tiles.length) {
      this.rebuildTiles(map);
      return;
    }

    for (let index = 0; index < map.tiles.length; index += 1) {
      const tile = map.tiles[index];
      const sprite = this.tileSprites[index];
      if (!sprite || !tile) {
        continue;
      }

      sprite.texture = this.getTileTexture(tile);
    }
  }

  private rebuildBuildings(map: WorldMap): void {
    for (const cleanup of this.spriteTapCleanup.values()) {
      cleanup();
    }
    this.spriteTapCleanup.clear();

    this.buildingLayer.removeChildren();
    this.buildingSprites.clear();

    for (const building of map.buildings) {
      const sprite = this.createBuildingSprite(building, map);
      this.buildingLayer.addChild(sprite);
      this.buildingSprites.set(building.id, sprite);
    }
  }

  private syncBuildings(map: WorldMap, previousMap: WorldMap | null): void {
    const nextById = new Map(map.buildings.map((building) => [building.id, building]));

    for (const [buildingId, sprite] of this.buildingSprites.entries()) {
      if (!nextById.has(buildingId)) {
        const cleanup = this.spriteTapCleanup.get(buildingId);
        cleanup?.();
        this.spriteTapCleanup.delete(buildingId);
        sprite.destroy();
        this.buildingSprites.delete(buildingId);
      }
    }

    for (const building of map.buildings) {
      const sprite = this.buildingSprites.get(building.id);
      if (!sprite) {
        const nextSprite = this.createBuildingSprite(building, map);
        this.buildingLayer.addChild(nextSprite);
        this.buildingSprites.set(building.id, nextSprite);
        continue;
      }

      const previous = previousMap?.buildings.find((entry: BuildingInstance) => entry.id === building.id);
      const stateChanged = previous ? previous.state !== building.state : false;
      const positionChanged = previous ? previous.x !== building.x || previous.y !== building.y : false;

      if (stateChanged) {
        sprite.texture = this.getBuildingTexture(building.type, building.state);
        this.playBuildingTransition(sprite, building.state);
      }

      if (positionChanged) {
        this.positionBuilding(sprite, building, map);
      }
    }
  }

  private createBuildingSprite(building: BuildingInstance, map: WorldMap): Sprite {
    const sprite = new Sprite(this.getBuildingTexture(building.type, building.state));
    sprite.anchor.set(0.5, 0.68);
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    this.positionBuilding(sprite, building, map);
    this.installBuildingTap(sprite, building.id);
    return sprite;
  }

  private positionBuilding(sprite: Sprite, building: BuildingInstance, map: WorldMap): void {
    const tileSize = map.tileSize;
    sprite.x = (building.x + 0.5) * tileSize;
    sprite.y = (building.y + 0.5) * tileSize;
    sprite.scale.set(1, 1);
  }

  private installBuildingTap(sprite: Sprite, buildingId: string): void {
    const cleanup = installTapRecognizer(sprite, {
      threshold: 8,
      onTap: () => {
        this.options.onBuildingTap?.(buildingId);
      },
    });

    this.spriteTapCleanup.set(buildingId, cleanup);
  }

  private playBuildingTransition(sprite: Sprite, state: BuildingState): void {
    if (state === "repaired") {
      sprite.scale.set(1.06);
      this.spawnParticles(sprite.x, sprite.y - sprite.height * 0.16, 8, "#ffee8a", "repair");
      window.setTimeout(() => {
        if (!sprite.destroyed) {
          sprite.scale.set(1);
        }
      }, 180);
      return;
    }

    sprite.scale.set(0.98);
    this.spawnParticles(sprite.x, sprite.y + sprite.height * 0.12, 6, "#9a8a77", "ruin");
    window.setTimeout(() => {
      if (!sprite.destroyed) {
        sprite.scale.set(1);
      }
    }, 180);
  }

  private spawnParticles(x: number, y: number, count: number, color: string, kind: EffectKind): void {
    for (let index = 0; index < count; index += 1) {
      const particle = new Sprite(Texture.WHITE);
      particle.tint = kind === "repair" ? 0xfff08a : 0xb5977d;
      particle.anchor.set(0.5);
      particle.width = kind === "repair" ? 3 : 4;
      particle.height = kind === "repair" ? 3 : 4;
      particle.position.set(x, y);
      this.effectLayer.addChild(particle);

      const angle = (Math.PI * 2 * index) / Math.max(1, count);
      this.particles.push({
        sprite: particle,
        vx: Math.cos(angle) * (kind === "repair" ? 1.6 : 1.1) + (Math.random() - 0.5) * 0.8,
        vy: Math.sin(angle) * (kind === "repair" ? 1.8 : 1.4) - (kind === "repair" ? 1.2 : 0.2),
        life: 0,
        ttl: kind === "repair" ? 480 : 420,
      });
    }
  }

  private updateParticles(deltaMS: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life += deltaMS;
      particle.sprite.x += particle.vx * (deltaMS / 16);
      particle.sprite.y += particle.vy * (deltaMS / 16);
      particle.vy += 0.02 * deltaMS;
      particle.sprite.alpha = Math.max(0, 1 - particle.life / particle.ttl);

      if (particle.life >= particle.ttl) {
        particle.sprite.destroy();
        this.particles.splice(index, 1);
      }
    }

    this.updateSelectionRing();
  }

  private updateSelectionRing(): void {
    if (!this.map || !this.selectedBuildingId) {
      this.selectionRing.visible = false;
      this.selectionRing.clear();
      return;
    }

    if (this.selectedBuildingUntil > 0 && performance.now() > this.selectedBuildingUntil) {
      this.selectedBuildingId = null;
      this.selectionRing.visible = false;
      this.selectionRing.clear();
      return;
    }

    const building = this.map.buildings.find((entry) => entry.id === this.selectedBuildingId);
    const sprite = building ? this.buildingSprites.get(building.id) : null;
    if (!building || !sprite) {
      this.selectionRing.visible = false;
      this.selectionRing.clear();
      return;
    }

    this.selectionRing.visible = true;
    this.selectionRing.clear();
    this.selectionRing.roundRect(sprite.x - 14, sprite.y - 18, 28, 28, 5).stroke({ width: 1.5, color: 0xffeb8a, alpha: 0.95 });
  }

  private updateViewportBounds(map: WorldMap): void {
    this.viewport.clamp({
      left: 0,
      top: 0,
      right: map.width * map.tileSize,
      bottom: map.height * map.tileSize,
    });
  }

  private getTileTexture(tileId: TileId): Texture {
    return this.tileTextures.get(tileId) ?? this.tileTextures.get("grass") ?? Texture.WHITE;
  }

  private getBuildingTexture(type: BuildingType, state: BuildingState): Texture {
    return this.buildingTextures.get(`${type}:${state}`) ?? Texture.WHITE;
  }

  private createTileTexture(tileSize: number, tileId: TileId): Texture {
    const graphics = new Graphics();

    if (tileId === "grass") {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x2f6f3a });
      graphics.rect(0, 0, tileSize, tileSize).stroke({ width: 1, color: 0x214d29, alpha: 0.3 });
      graphics.rect(2, 2, 3, 1).fill({ color: 0x4f8f4f, alpha: 0.4 });
      graphics.rect(9, 5, 2, 1).fill({ color: 0x5da35d, alpha: 0.3 });
    } else if (tileId === "dirt") {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x6f5738 });
      graphics.rect(0, 0, tileSize, tileSize).stroke({ width: 1, color: 0x4c3922, alpha: 0.36 });
      graphics.rect(2, 3, 6, 2).fill({ color: 0x8b6b43, alpha: 0.34 });
    } else if (tileId === "road-horizontal") {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x7a7f7a });
      graphics.rect(0, tileSize / 2 - 2, tileSize, 4).fill({ color: 0x5e635e });
      graphics.rect(0, 0, tileSize, tileSize).stroke({ width: 1, color: 0x3d423d, alpha: 0.38 });
      graphics.rect(7, tileSize / 2 - 1, 2, 2).fill({ color: 0xc9b97a });
    } else if (tileId === "road-vertical") {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x7a7f7a });
      graphics.rect(tileSize / 2 - 2, 0, 4, tileSize).fill({ color: 0x5e635e });
      graphics.rect(0, 0, tileSize, tileSize).stroke({ width: 1, color: 0x3d423d, alpha: 0.38 });
      graphics.rect(tileSize / 2 - 1, 7, 2, 2).fill({ color: 0xc9b97a });
    } else if (tileId === "road-cross") {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x777d77 });
      graphics.rect(0, tileSize / 2 - 2, tileSize, 4).fill({ color: 0x5e635e });
      graphics.rect(tileSize / 2 - 2, 0, 4, tileSize).fill({ color: 0x5e635e });
      graphics.rect(0, 0, tileSize, tileSize).stroke({ width: 1, color: 0x3d423d, alpha: 0.38 });
      graphics.rect(7, tileSize / 2 - 1, 2, 2).fill({ color: 0xc9b97a });
      graphics.rect(tileSize / 2 - 1, 7, 2, 2).fill({ color: 0xc9b97a });
    } else if (tileId === "concrete") {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x908878 });
      graphics.rect(1, 1, tileSize - 2, tileSize - 2).stroke({ width: 1, color: 0x635f52, alpha: 0.35 });
      graphics.rect(3, 3, 3, 3).fill({ color: 0xb0aa98, alpha: 0.25 });
    } else {
      graphics.rect(0, 0, tileSize, tileSize).fill({ color: 0x191814 });
      graphics.circle(tileSize * 0.45, tileSize * 0.52, tileSize * 0.34).fill({ color: 0x36312c, alpha: 0.92 });
      graphics.circle(tileSize * 0.6, tileSize * 0.4, tileSize * 0.12).fill({ color: 0x231f1c, alpha: 0.8 });
    }

    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    return texture;
  }

  private createBuildingTexture(tileSize: number, type: BuildingType, state: BuildingState): Texture {
    const graphics = new Graphics();
    const width = Math.round(tileSize * 1.55);
    const height = Math.round(tileSize * 1.15);
    const palette = this.getBuildingPalette(type);

    graphics.roundRect(0, 0, width, height, 4).fill({ color: state === "repaired" ? palette.base : palette.ruinedBase });
    graphics.roundRect(0, 0, width, height, 4).stroke({ width: 1, color: palette.outline, alpha: 0.88 });
    graphics.roundRect(4, 3, width - 8, height - 7, 3).fill({ color: palette.inner, alpha: 0.55 });
    graphics.rect(width * 0.22, 2, width * 0.12, height - 4).fill({ color: palette.highlight, alpha: 0.36 });
    graphics.rect(width * 0.62, 4, width * 0.14, height - 8).fill({ color: palette.shadow, alpha: 0.18 });

    if (type === "radar") {
      graphics.circle(width * 0.5, height * 0.48, tileSize * 0.18).fill({ color: palette.highlight, alpha: 0.85 });
      graphics.circle(width * 0.5, height * 0.48, tileSize * 0.33).stroke({ width: 1, color: palette.highlight, alpha: 0.8 });
    } else if (type === "factory") {
      graphics.rect(width * 0.16, height * 0.24, width * 0.18, height * 0.48).fill({ color: palette.highlight, alpha: 0.7 });
      graphics.rect(width * 0.4, height * 0.2, width * 0.16, height * 0.55).fill({ color: palette.highlight, alpha: 0.65 });
      graphics.rect(width * 0.62, height * 0.28, width * 0.18, height * 0.42).fill({ color: palette.highlight, alpha: 0.55 });
    } else if (type === "barracks") {
      graphics.rect(width * 0.12, height * 0.26, width * 0.76, height * 0.26).fill({ color: palette.highlight, alpha: 0.5 });
      graphics.rect(width * 0.18, height * 0.56, width * 0.64, height * 0.1).fill({ color: palette.shadow, alpha: 0.26 });
    } else if (type === "turret") {
      graphics.rect(width * 0.38, height * 0.2, width * 0.24, height * 0.52).fill({ color: palette.highlight, alpha: 0.68 });
      graphics.circle(width * 0.5, height * 0.18, tileSize * 0.14).fill({ color: palette.highlight, alpha: 0.72 });
    } else if (type === "power") {
      graphics.rect(width * 0.24, height * 0.18, width * 0.52, height * 0.58).fill({ color: palette.highlight, alpha: 0.62 });
      graphics.rect(width * 0.36, height * 0.12, width * 0.28, height * 0.1).fill({ color: palette.shadow, alpha: 0.18 });
    }

    if (state === "ruined") {
      graphics.moveTo(width * 0.2, height * 0.2).lineTo(width * 0.4, height * 0.45).lineTo(width * 0.25, height * 0.75).stroke({ width: 1, color: 0x1f1412, alpha: 0.8 });
      graphics.moveTo(width * 0.75, height * 0.18).lineTo(width * 0.58, height * 0.48).lineTo(width * 0.82, height * 0.77).stroke({ width: 1, color: 0x1f1412, alpha: 0.8 });
      graphics.moveTo(width * 0.18, height * 0.66).lineTo(width * 0.82, height * 0.32).stroke({ width: 1, color: 0xfff1c0, alpha: 0.22 });
    }

    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    return texture;
  }

  private getBuildingPalette(type: BuildingType): { base: number; ruinedBase: number; outline: number; inner: number; highlight: number; shadow: number } {
    switch (type) {
      case "radar":
        return { base: 0x6da2b7, ruinedBase: 0x516877, outline: 0x1f2e37, inner: 0xa8d8e7, highlight: 0xe7f8ff, shadow: 0x47616d };
      case "barracks":
        return { base: 0x8d8c61, ruinedBase: 0x635f48, outline: 0x27241a, inner: 0xded6a5, highlight: 0xf8efb9, shadow: 0x5b553f };
      case "factory":
        return { base: 0x8e6f5a, ruinedBase: 0x624f41, outline: 0x291f1a, inner: 0xe3b18a, highlight: 0xffd6b5, shadow: 0x6d5547 };
      case "turret":
        return { base: 0x7b8d5b, ruinedBase: 0x566441, outline: 0x1f2716, inner: 0xcce18f, highlight: 0xf2ffcf, shadow: 0x4a5635 };
      case "power":
        return { base: 0x7d6eb5, ruinedBase: 0x4d466d, outline: 0x231f38, inner: 0xd7d0ff, highlight: 0xf1eaff, shadow: 0x3d355a };
      default:
        return { base: 0x888888, ruinedBase: 0x555555, outline: 0x222222, inner: 0xffffff, highlight: 0xffffff, shadow: 0x444444 };
    }
  }
}
