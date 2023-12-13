import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";

interface UserContextProps {
  currentUser: { id: string };
  email: string;
  updateEmail: (email: string) => Promise<void>;
}

export const UserContext = createContext<UserContextProps>({
  currentUser: { id: "" },
  email: "",
  updateEmail: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    AsyncStorage.getItem("email").then((email) => {
      setEmail(email || "");
    });
  }, []);

  async function updateEmail(newEmail: string) {
    await AsyncStorage.setItem("email", newEmail);
    setEmail(newEmail);
  }

  return (
    <UserContext.Provider
      value={{ currentUser: { id: email }, email, updateEmail }}
    >
      {children}
    </UserContext.Provider>
  );
}
