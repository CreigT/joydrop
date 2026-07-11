"use client";

import Confetti from "react-confetti";
import { useEffect, useState } from "react";

export function ConfettiBurst() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function resize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return <Confetti width={size.width} height={size.height} recycle={false} />;
}
