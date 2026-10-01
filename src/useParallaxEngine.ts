import { useEffect } from "react";

type Frames = [number, number, number];
type LayerState = { x: number; y: number; scale: number; opacity: number; rotate: number; blur: number };
type ScrollLayer = {
  element: HTMLElement;
  current: LayerState | null;
  frames: Record<keyof LayerState, Frames>;
  phase: number;
  strength: number;
  damping: number;
  pointer: number;
  pointerX: number;
  pointerY: number;
};
type ScrollScene = {
  element: HTMLElement;
  root: HTMLElement | null;
  layers: ScrollLayer[];
  start: number;
  end: number;
  range: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const keys: (keyof LayerState)[] = ["x", "y", "scale", "opacity", "rotate", "blur"];
const defaults: LayerState = { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0, blur: 0 };

function frames(value: string | undefined, fallback: number): Frames {
  const values = value?.split(",").map(Number).filter(Number.isFinite) ?? [];
  if (values.length === 1) return [-values[0], 0, values[0]];
  if (values.length === 2) return [values[0], values[1], values[1]];
  if (values.length >= 3) return [values[0], values[1], values[2]];
  return [fallback, fallback, fallback];
}

function sample(values: Frames, progress: number) {
  return progress <= 0.5
    ? lerp(values[0], values[1], smoothstep(progress * 2))
    : lerp(values[1], values[2], smoothstep((progress - 0.5) * 2));
}

function layoutTop(element: HTMLElement) {
  let top = 0;
  let ancestor: HTMLElement | null = element;
  while (ancestor) {
    top += ancestor.offsetTop;
    ancestor = ancestor.offsetParent as HTMLElement | null;
  }
  return top;
}

export function useScrollSceneEngine() {
  useEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(pointer: fine)");
    const layerCache = new WeakMap<HTMLElement, ScrollLayer>();
    const renderedVariables = new WeakMap<HTMLElement, Map<string, string>>();
    const revealed = new WeakSet<Element>();
    const rootHeights = new Map<HTMLElement | null, number>();
    const observedSizes = new Set<Element>();
    let scenes: ScrollScene[] = [];
    let viewportHeight = innerHeight;
    let viewportWidth = innerWidth;
    let pageMax = 0;
    let geometryDirty = true;
    let frame = 0;
    let lastTime = 0;
    let disposed = false;
    let pointerX = -100;
    let pointerY = -100;
    let pointerPresent = false;
    let pointerTarget: HTMLElement | null = null;
    let previousPointerTarget: HTMLElement | null = null;
    let cursorDirty = false;
    let cursor: HTMLElement | null = null;

    const writeVariable = (element: HTMLElement, name: string, value: string) => {
      let values = renderedVariables.get(element);
      if (!values) {
        values = new Map();
        renderedVariables.set(element, values);
      }
      if (values.get(name) !== value) {
        element.style.setProperty(name, value);
        values.set(name, value);
      }
    };

    const requestRender = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(render);
    };
    const invalidateGeometry = () => {
      geometryDirty = true;
      requestRender();
    };
    const reveals = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          reveals.unobserve(entry.target);
        }
      }),
      { threshold: 0.12 },
    );
    const resizeObserver = new ResizeObserver(invalidateGeometry);

    function measure() {
      viewportHeight = innerHeight;
      viewportWidth = innerWidth;
      pageMax = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
      rootHeights.clear();
      rootHeights.set(null, viewportHeight);
      const sizeTargets = new Set<Element>([document.documentElement]);
      scenes = [...document.querySelectorAll<HTMLElement>("[data-scroll-scene]")].map((element) => {
        const root = element.closest<HTMLElement>(".overlay-scroll");
        const height = root ? root.clientHeight : viewportHeight;
        if (root && !rootHeights.has(root)) {
          rootHeights.set(root, height);
          sizeTargets.add(root);
        }
        const top = layoutTop(element) - (root ? layoutTop(root) : 0);
        const sectionHeight = element.offsetHeight;
        const visibleOrigin = element.dataset.sceneOrigin === "visible";
        const range = visibleOrigin ? Math.max(sectionHeight - height, height * 0.2) * 2 : height + sectionHeight;
        const start = visibleOrigin ? top - range / 2 : top - height;
        sizeTargets.add(element);
        const layers = [...element.querySelectorAll<HTMLElement>("[data-scroll-layer]")]
          .filter((layer) => layer.closest("[data-scroll-scene]") === element)
          .map((layer) => {
            const existing = layerCache.get(layer);
            if (existing) return existing;
            const configuration = Object.fromEntries(keys.map((key) => [key, frames(layer.dataset[key], defaults[key])])) as Record<keyof LayerState, Frames>;
            const state: ScrollLayer = {
              element: layer, current: null, frames: configuration,
              phase: Number(layer.dataset.phase || 0), strength: Number(layer.dataset.strength || 1),
              damping: clamp(Number(layer.dataset.damping || 0.18), 0.01, 1),
              pointer: Number(layer.dataset.pointer || 0), pointerX: 0, pointerY: 0,
            };
            layerCache.set(layer, state);
            return state;
          });
        return { element, root, layers, start, end: start + range, range };
      });
      observedSizes.forEach((element) => {
        if (!sizeTargets.has(element)) {
          resizeObserver.unobserve(element);
          observedSizes.delete(element);
        }
      });
      sizeTargets.forEach((element) => {
        if (!observedSizes.has(element)) {
          resizeObserver.observe(element);
          observedSizes.add(element);
        }
      });
      document.querySelectorAll(".reveal").forEach((element) => {
        if (!revealed.has(element)) {
          reveals.observe(element);
          revealed.add(element);
        }
      });
      cursor = document.querySelector(".cursor");
      geometryDirty = false;
    }

    function render(time: number) {
      if (geometryDirty) measure();
      const scrollPositions = new Map<HTMLElement | null, number>([[null, window.scrollY]]);
      rootHeights.forEach((_, root) => { if (root) scrollPositions.set(root, root.scrollTop); });
      const anchor = pointerTarget?.parentElement?.matches(".magnetic-anchor") ? pointerTarget.parentElement : pointerTarget;
      const pointerRect = anchor?.getBoundingClientRect();
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 1000 / 60;
      lastTime = time;
      const strength = viewportWidth < 600 ? 0.26 : viewportWidth < 1100 ? 0.66 : 1;
      const pointerEnabled = pointerPresent && finePointer.matches && !reducedMotion.matches;
      const writes: (() => void)[] = [];
      let unsettled = false;
      const progress = pageMax ? clamp((scrollPositions.get(null) ?? 0) / pageMax) : 0;
      writes.push(() => writeVariable(document.documentElement, "--progress", String(progress)));

      scenes.forEach((scene) => {
        if (scene.root && !scene.root.closest(".overlay.open")) return;
        const sceneProgress = clamp(((scrollPositions.get(scene.root) ?? 0) - scene.start) / scene.range);
        writes.push(() => writeVariable(scene.element, "--scene-progress", String(sceneProgress)));
        scene.layers.forEach((layer) => {
          const layerProgress = clamp(sceneProgress + layer.phase);
          const target = { ...defaults };
          keys.forEach((key) => {
            const values = layer.frames[key];
            const sampled = sample(values, layerProgress);
            target[key] = reducedMotion.matches ? defaults[key] : key === "opacity"
              ? clamp(1 + (sampled - 1) * strength)
              : key === "blur" ? Math.max(0, sampled * strength)
              : values[1] + (sampled - values[1]) * strength * layer.strength;
          });
          const amount = 1 - Math.pow(1 - layer.damping, elapsed / (1000 / 60));
          if (!layer.current || reducedMotion.matches) layer.current = { ...target };
          const current = layer.current;
          keys.forEach((key) => {
            const difference = target[key] - current[key];
            const tolerance = key === "scale" || key === "opacity" ? 0.00001 : 0.001;
            current[key] = Math.abs(difference) < tolerance ? target[key] : lerp(current[key], target[key], amount);
            if (Math.abs(difference) >= tolerance) unsettled = true;
          });
          const pointerStrength = pointerEnabled ? layer.pointer * strength : 0;
          const targetX = (pointerX / viewportWidth - 0.5) * pointerStrength;
          const targetY = (pointerY / viewportHeight - 0.5) * pointerStrength;
          layer.pointerX = lerp(layer.pointerX, targetX, amount);
          layer.pointerY = lerp(layer.pointerY, targetY, amount);
          if (Math.abs(layer.pointerX - targetX) > 0.001 || Math.abs(layer.pointerY - targetY) > 0.001) unsettled = true;
          writes.push(() => {
            keys.forEach((key) => {
              const unit = key === "x" || key === "y" || key === "blur" ? "px" : key === "rotate" ? "deg" : "";
              writeVariable(layer.element, `--scene-${key}`, `${current[key]}${unit}`);
            });
            writeVariable(layer.element, "--pointer-x", `${layer.pointerX}px`);
            writeVariable(layer.element, "--pointer-y", `${layer.pointerY}px`);
          });
        });
      });

      const activeTarget = pointerTarget;
      if (previousPointerTarget && previousPointerTarget !== activeTarget) {
        const previous = previousPointerTarget;
        writes.push(() => {
          ["--project-x", "--project-y", "--mag-x", "--mag-y"].forEach((name) => writeVariable(previous, name, "0px"));
        });
      }
      if (activeTarget && pointerRect) {
        const project = activeTarget.matches(".project-row");
        const offsetX = pointerEnabled ? pointerX - pointerRect.left - pointerRect.width / 2 : 0;
        const offsetY = pointerEnabled ? pointerY - pointerRect.top - pointerRect.height / 2 : 0;
        writes.push(() => {
          writeVariable(activeTarget, project ? "--project-x" : "--mag-x", `${project ? offsetX / Math.max(1, pointerRect.width) * 10 : offsetX * 0.12}px`);
          writeVariable(activeTarget, project ? "--project-y" : "--mag-y", `${project ? offsetY / Math.max(1, pointerRect.height) * 8 : offsetY * 0.12}px`);
        });
      }
      previousPointerTarget = activeTarget;
      if (cursorDirty && cursor) {
        const node = cursor;
        writes.push(() => {
          writeVariable(node, "--cursor-x", `${pointerX}px`);
          writeVariable(node, "--cursor-y", `${pointerY}px`);
        });
        cursorDirty = false;
      }
      writes.forEach((write) => write());
      frame = 0;
      if (unsettled) requestRender();
      else lastTime = 0;
    }

    const onPointer = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerPresent = true;
      pointerTarget = (event.target as Element).closest<HTMLElement>(".project-row, .magnetic-anchor .magnetic");
      cursorDirty = true;
      requestRender();
    };
    const onPointerLeave = () => {
      pointerPresent = false;
      pointerTarget = null;
      requestRender();
    };
    const mutations = new MutationObserver((records) => {
      const selector = "[data-scroll-scene], [data-scroll-layer], .reveal, .overlay-scroll";
      if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) =>
        node instanceof Element && (node.matches(selector) || node.querySelector(selector)),
      ))) invalidateGeometry();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", requestRender, { passive: true, capture: true });
    addEventListener("resize", invalidateGeometry);
    addEventListener("orientationchange", invalidateGeometry);
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("pointerover", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    reducedMotion.addEventListener("change", invalidateGeometry);
    finePointer.addEventListener("change", invalidateGeometry);
    document.fonts.addEventListener("loadingdone", invalidateGeometry);
    document.fonts.ready.then(() => { if (!disposed) invalidateGeometry(); });
    requestRender();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      reveals.disconnect();
      mutations.disconnect();
      document.removeEventListener("scroll", requestRender, true);
      removeEventListener("resize", invalidateGeometry);
      removeEventListener("orientationchange", invalidateGeometry);
      removeEventListener("pointermove", onPointer);
      removeEventListener("pointerover", onPointer);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      reducedMotion.removeEventListener("change", invalidateGeometry);
      finePointer.removeEventListener("change", invalidateGeometry);
      document.fonts.removeEventListener("loadingdone", invalidateGeometry);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

export const useParallaxEngine = useScrollSceneEngine;
