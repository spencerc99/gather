// ABOUTME: Publishes a shared minute clock for relative timestamps in visible app content.
// ABOUTME: Stops the single clock while Gather is inactive to avoid background wakeups.
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useIsAppActive } from "../utils/appActivity";

const TimeContext = createContext(Date.now());
const TimeUpdateInterval = 60 * 1000;

export function TimeProvider({ children }: PropsWithChildren) {
  const [time, setTime] = useState(Date.now());
  const isAppActive = useIsAppActive();

  useEffect(() => {
    if (!isAppActive) {
      return;
    }
    setTime(Date.now());
    const interval = setInterval(() => {
      setTime(Date.now());
    }, TimeUpdateInterval);
    return () => clearInterval(interval);
  }, [isAppActive]);

  return <TimeContext.Provider value={time}>{children}</TimeContext.Provider>;
}

export function useTime() {
  return useContext(TimeContext);
}
