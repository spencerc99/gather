// ABOUTME: Publishes whether the native app is active through one AppState subscription.
// ABOUTME: Lets timers and media suspend work while Gather is inactive.
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

const AppActivityContext = createContext(AppState.currentState === "active");

export function AppActivityProvider({ children }: PropsWithChildren) {
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active",
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setIsAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppActivityContext.Provider value={isAppActive}>
      {children}
    </AppActivityContext.Provider>
  );
}

export function useIsAppActive(): boolean {
  return useContext(AppActivityContext);
}
