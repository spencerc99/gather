import { useState, useEffect } from "react";

export function useTime(updateInterval: number = 1000) {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, updateInterval);
    return () => clearInterval(interval);
  }, []);
  return time;
}
