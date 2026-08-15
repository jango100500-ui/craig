import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

interface LottieIconProps {
  src: string;
  className?: string;
  fallbackClass?: string;
}

export const LottieIcon: React.FC<LottieIconProps> = ({ src, className = '', fallbackClass = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;
    setLoaded(false);

    fetch(`${src}?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!containerRef.current) return;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
        });
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(false);
      });

    return () => {
      anim?.destroy();
    };
  }, [src]);

  return (
    <div className={`lottie-icon-host ${className}`}>
      {!loaded && <div className={`ios-skeleton-box ${fallbackClass}`} />}
      <div 
        ref={containerRef} 
        className={`lottie-player ${loaded ? 'visible' : 'hidden'}`} 
      />
    </div>
  );
};
