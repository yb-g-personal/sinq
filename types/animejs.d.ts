declare module 'animejs' {
  type AnimeTarget = Element | Element[] | NodeListOf<Element>;
  type AnimeValue = number | string | ((target: AnimeTarget, index: number) => number | string);

  type AnimeAnimation = {
    pause: () => void;
  };

  type AnimeOptions = {
    targets: AnimeTarget;
    scaleY?: AnimeValue;
    translateX?: AnimeValue;
    duration?: number;
    delay?: number | ((index: number) => number);
    direction?: 'normal' | 'reverse' | 'alternate';
    loop?: boolean | number;
    easing?: string;
  };

  type AnimeFunction = ((options: AnimeOptions) => AnimeAnimation) & {
    stagger: (value: number) => (index: number) => number;
  };

  const anime: AnimeFunction;
  export default anime;
}
