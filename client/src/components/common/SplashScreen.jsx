import React, { useState, useEffect } from 'react';
import flashImage from '../../wesbite_image_folder/fleshImage.png';

export const SplashScreen = ({ onFinish, duration = 5000 }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
    }, 50);

    // Trigger fade-out slightly before finishing (last 400ms)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, Math.max(0, duration - 400));

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-99999 bg-white flex flex-col items-center justify-center transition-opacity duration-500 select-none overflow-hidden ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ minHeight: '100vh', minWidth: '100vw' }}
    >
      {/* Full Page Flash Image Container */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-black/95">
        <img
          src={flashImage}
          alt="Flash Screen"
          className="max-w-full max-h-[85vh] w-auto h-auto object-contain animate-in fade-in zoom-in-95 duration-700 drop-shadow-2xl rounded-2xl"
        />

        {/* 5-second dynamic progress bar at bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 sm:w-80 max-w-[85vw] flex flex-col items-center gap-2">
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden backdrop-blur-xs">
            <div
              className="bg-linear-to-r from-red-500 via-rose-500 to-amber-500 h-full rounded-full transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-medium text-white/60 tracking-wider">
            Loading Portal...
          </span>
        </div>
      </div>
    </div>
  );
};
