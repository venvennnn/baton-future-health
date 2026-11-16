"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const SCENES = [
  {
    id: "chapter-0",
    title: "Follow up",
    label: "Follow up with Baton",
    body: "See who still needs to hear their result or get help with the next step.",
    photo: "/photos/follow-up.jpg",
    alt: "Clinician in a green hijab speaking with a patient, with the Abu Dhabi skyline behind them",
    orb: "follow",
  },
  {
    id: "chapter-1",
    title: "Hand over",
    label: "Hand over with Baton",
    body: "See who owns the referral while the receiving team reviews it.",
    photo: "/photos/hand-over.jpg",
    alt: "Two clinicians reviewing a tablet together in a hospital corridor",
    orb: "handover",
  },
  {
    id: "chapter-2",
    title: "Close the loop",
    label: "Close the loop with Baton",
    body: "Keep follow-up open until the care team records what happened.",
    photo: "/photos/close-the-loop.jpg",
    alt: "Physician reviewing an imaging printout with a patient in a bright clinic",
    orb: "loop",
  },
] as const;

function letters(title: string) {
  const words = title.split(" ");
  return words.map((word, wordIndex) => (
    <span key={word} className="story-word">
      {word.split("").map((letter, letterIndex) => (
        <span key={`${word}-${letterIndex}`} className="story-letter">
          {letter}
        </span>
      ))}
      {wordIndex < words.length - 1 ? " " : null}
    </span>
  ));
}

function Orb({ kind }: { kind: "follow" | "handover" | "loop" }) {
  const id = kind;
  if (kind === "follow") {
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-o`} cx="32%" cy="26%" r="85%">
            <stop offset="0" stopColor="#a7f3d0" />
            <stop offset=".35" stopColor="#10b981" />
            <stop offset="1" stopColor="#064e3b" />
          </radialGradient>
          <radialGradient id={`${id}-h`} cx="50%" cy="0%" r="80%">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${id}-o)`} />
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
          <circle className="g-ring" cx="60" cy="60" r="27" strokeWidth="7" opacity=".55" />
          <path className="g-check" d="M47 61 L56 70 L75 49" strokeWidth="9" />
        </g>
        <ellipse cx="46" cy="24" rx="30" ry="15" fill={`url(#${id}-h)`} opacity=".8" />
      </svg>
    );
  }
  if (kind === "handover") {
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-o`} cx="32%" cy="26%" r="85%">
            <stop offset="0" stopColor="#99f6e4" />
            <stop offset=".35" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#0f4c5c" />
          </radialGradient>
          <radialGradient id={`${id}-h`} cx="50%" cy="0%" r="80%">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="54" fill={`url(#${id}-o)`} />
        <g fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          <g className="g-ho-a">
            <path d="M36 48 H76" />
            <polygon points="78,38 94,48 78,58" fill="#fff" />
          </g>
          <g className="g-ho-b">
            <path d="M84 73 H44" />
            <polygon points="42,63 26,73 42,83" fill="#fff" />
          </g>
        </g>
        <ellipse cx="46" cy="24" rx="30" ry="15" fill={`url(#${id}-h)`} opacity=".8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-o`} cx="32%" cy="26%" r="85%">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset=".35" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id={`${id}-h`} cx="50%" cy="0%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-o)`} />
      <g className="g-loop" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M37 60 A23 23 0 0 1 67.9 38.4" />
        <polygon points="76.4,41.5 65.5,45 70.3,31.8" fill="#fff" />
        <path d="M83 60 A23 23 0 0 1 52.1 81.6" />
        <polygon points="43.6,78.5 54.5,75 49.7,88.2" fill="#fff" />
      </g>
      <ellipse cx="46" cy="24" rx="30" ry="15" fill={`url(#${id}-h)`} opacity=".8" />
    </svg>
  );
}

export function ScrollStory() {
  const storyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const story = storyRef.current;
    if (!story) return;
    const stage = story.querySelector<HTMLElement>(".story-stage");
    if (!stage) return;
    const scenes = [...story.querySelectorAll<HTMLElement>(".scroll-scene")];
    const glyphs = scenes.map((scene) => [...scene.querySelectorAll<HTMLElement>(".story-letter")]);
    const indicators = [...story.querySelectorAll<HTMLElement>(".story-progress i")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let current = -1;

    function render() {
      frame = 0;
      const enhanced = !reduced.matches;
      const range = Math.max(story!.offsetHeight - stage!.offsetHeight, 1);
      const stickyTop = parseFloat(getComputedStyle(stage!).top) || 0;
      const progress = Math.max(0, Math.min(1, (stickyTop - story!.getBoundingClientRect().top) / range));
      const next = enhanced ? Math.round(progress * 2) : -1;
      if (enhanced) {
        const position = progress * 2;
        const floor = Math.min(1, Math.floor(position));
        const fraction = position - floor;
        const blend = Math.max(0, Math.min(1, (fraction - 0.25) / 0.5));
        const fade = blend * blend * (3 - 2 * blend);
        scenes.forEach((scene, index) => {
          const inFrame = index === floor || index === floor + 1;
          const incoming = index === floor + 1;
          scene.classList.toggle("in-frame", inFrame);
          scene.style.zIndex = String(index + 1);
          scene.style.setProperty("--photo", incoming ? String(fade) : "1");
          if (!inFrame) return;
          const orbVisibility = incoming ? fade : 1 - fade;
          scene.style.setProperty("--orb-alpha", String(orbVisibility));
          scene.style.setProperty("--orb-rise", `${(incoming ? 1 : -1) * (1 - orbVisibility) * 0.2}em`);
          scene.style.setProperty("--orb-scale", String(0.78 + 0.22 * orbVisibility));
          glyphs[index].forEach((glyph, glyphIndex) => {
            const stagger = (0.31 * glyphIndex) / Math.max(1, glyphs[index].length - 1);
            const amountRaw = incoming ? fade * 1.31 - stagger : (1 - fade) * 1.31 - (0.31 - stagger);
            const amount = Math.max(0, Math.min(1, amountRaw));
            const eased = amount * amount * (3 - 2 * amount);
            const offset = (incoming ? 1 : -1) * (1 - eased);
            glyph.style.setProperty("--letter-alpha", String(eased));
            glyph.style.setProperty("--letter-y", `${offset * 0.56}em`);
            glyph.style.setProperty("--letter-tilt", `${offset * 38}deg`);
            glyph.style.setProperty("--letter-blur", `${(1 - eased) * 6}px`);
          });
          const copy = incoming ? Math.max(0, 2 * fade - 1) : Math.max(0, 1 - 2 * fade);
          scene.style.setProperty("--copy", String(copy));
          scene.style.setProperty("--zoom", String(1.02 + 0.045 * (incoming ? fraction : 1 - fraction)));
        });
      } else {
        scenes.forEach((scene) => {
          scene.style.zIndex = "";
          scene.classList.remove("in-frame");
        });
      }
      if (next === current) return;
      current = next;
      scenes.forEach((scene, index) => {
        const visible = !enhanced || index === next;
        scene.classList.toggle("active", visible);
        scene.inert = !visible;
        scene.setAttribute("aria-hidden", String(!visible));
        indicators[index]?.classList.toggle("active", index === next);
      });
    }

    function queue() {
      if (!frame) frame = requestAnimationFrame(render);
    }
    function configure() {
      current = -2;
      story!.classList.toggle("enhanced", !reduced.matches);
      render();
    }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    reduced.addEventListener("change", configure);
    configure();
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      reduced.removeEventListener("change", configure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={storyRef} className="scroll-story" aria-label="How Baton follows a screening result">
      <div className="story-stage">
        {SCENES.map((scene, index) => {
          const Heading = index === 0 ? "h1" : "h2";
          return (
            <article key={scene.id} id={scene.id} className={index === 0 ? "scroll-scene active" : "scroll-scene"}>
              <div className="scene-text">
                <Heading aria-label={scene.label}>
                  <span aria-hidden="true">
                    <span className="story-orb">
                      <Orb kind={scene.orb} />
                    </span>
                    {letters(scene.title)}
                  </span>
                  <br />
                  <em aria-hidden="true">with Baton.</em>
                </Heading>
                <p>{scene.body}</p>
                <a className="scene-link" href="#interactive-flows">
                  Explore the pathway <span aria-hidden="true">↓</span>
                </a>
              </div>
              <figure>
                <Image src={scene.photo} alt={scene.alt} fill sizes="100vw" priority={index === 0} />
              </figure>
            </article>
          );
        })}
        <div className="story-progress" aria-hidden="true">
          <i className="active" />
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}
