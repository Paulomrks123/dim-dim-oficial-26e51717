import { useEffect, useRef } from "react";

/** Keep currency intact; shrink only when its own available width requires it. */
export function FitAmount({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => {
      node.style.removeProperty("font-size");
      const base = parseFloat(getComputedStyle(node).fontSize);
      if (node.clientWidth > 0 && node.scrollWidth > node.clientWidth) {
        node.style.fontSize = `${base * node.clientWidth / node.scrollWidth}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    void document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [text]);
  return <span ref={ref} className={`fit-amount ${className}`}>{text}</span>;
}