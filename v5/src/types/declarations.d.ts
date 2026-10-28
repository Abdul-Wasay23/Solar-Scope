// Ambient declarations for CSS and static assets
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

type GsapOptions = Record<string, unknown>;

interface Window {
  L?: typeof import("leaflet");
  gsap?: {
    registerPlugin(plugin: unknown): void;
    timeline(options?: GsapOptions): {
      fromTo(
        target: string | Element | NodeListOf<Element>,
        from: GsapOptions,
        to: GsapOptions,
        position?: number | string,
      ): GsapTimeline;
    };
    fromTo(
      target: string | Element | NodeListOf<Element>,
      from: GsapOptions,
      to: GsapOptions,
      position?: number | string,
    ): GsapTimeline;
  };
  ScrollTrigger?: {
    getAll(): Array<{ kill(): void }>;
  };
}

type GsapTimeline = {
  fromTo(
    target: string | Element | NodeListOf<Element>,
    from: GsapOptions,
    to: GsapOptions,
    position?: number | string,
  ): GsapTimeline;
};
