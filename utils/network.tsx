import { PropsWithChildren, createContext, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

interface NetworkContextType {
  isConnected: boolean;
}

export const NetworkContext = createContext<NetworkContextType>({
  isConnected: false,
});

export function NetworkProvider({ children }: PropsWithChildren<{}>) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected));
    });
    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}
