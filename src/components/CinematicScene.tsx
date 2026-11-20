import { useEffect, useRef } from "react";

/** Decorative planes only; financial content never moves with the background. */
export function CinematicScene() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0, y = 0;
    const update = () => {
      frame = 0;
      root.style.setProperty("--scene-x", `${x}px`);
      root.style.setProperty("--scene-y", `${y}px`);
      root.style.setProperty("--scene-scroll", `${Math.min(window.scrollY, 1800)}px`);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x = (event.clientX / window.innerWidth - .5) * 24;
      y = (event.clientY / window.innerHeight - .5) * 18;
      queue();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", queue, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", queue);
    };
  }, []);
  return <div ref={ref} className="cinematic-scene" aria-hidden="true"><div className="scene-atmosphere" /><div className="scene-grid" /><div className="scene-light" /><div className="scene-grain" /></div>;
}

export function useCinematicReveal(path: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = document.querySelectorAll<HTMLElement>(".workspace-content > div > section, .workspace-content > section, .category-grid > div");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    nodes.forEach((node) => { node.classList.add("cinematic-reveal"); observer.observe(node); });
    return () => { observer.disconnect(); nodes.forEach((node) => node.classList.remove("cinematic-reveal", "reveal-visible")); };
  }, [path, enabled]);
}