import type { Container, FederatedPointerEvent } from "pixi.js";

export interface TapRecognizerOptions {
  threshold?: number;
  onTap: (event: FederatedPointerEvent) => void;
}

export function installTapRecognizer(target: Container, options: TapRecognizerOptions): () => void {
  const threshold = options.threshold ?? 8;
  let startX = 0;
  let startY = 0;
  let moved = false;

  target.eventMode = "static";
  target.cursor = "pointer";

  const onPointerDown = (event: FederatedPointerEvent): void => {
    startX = event.global.x;
    startY = event.global.y;
    moved = false;
  };

  const onPointerMove = (event: FederatedPointerEvent): void => {
    if (moved) {
      return;
    }

    const dx = Math.abs(event.global.x - startX);
    const dy = Math.abs(event.global.y - startY);
    if (dx > threshold || dy > threshold) {
      moved = true;
    }
  };

  const onPointerUp = (event: FederatedPointerEvent): void => {
    if (!moved) {
      options.onTap(event);
    }
  };

  target.on("pointerdown", onPointerDown);
  target.on("pointermove", onPointerMove);
  target.on("pointerup", onPointerUp);
  target.on("pointerupoutside", onPointerUp);

  return () => {
    target.off("pointerdown", onPointerDown);
    target.off("pointermove", onPointerMove);
    target.off("pointerup", onPointerUp);
    target.off("pointerupoutside", onPointerUp);
  };
}
