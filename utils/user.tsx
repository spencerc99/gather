import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";

interface UserInsertInfo {
  email: string;
}

interface UserDbInfo extends UserInsertInfo {
  // id: string;
  createdAt: string;
}

interface UserInfo extends UserInsertInfo {
  createdAt: Date;
}

interface UserContextProps {
  // TODO: change this when you actually add id
  currentUser: (UserInfo & { id: string }) | null;
  email: string;
  updateEmail: (email: string) => Promise<void>;
  setupUser: (user: UserInsertInfo) => Promise<void>;
}

export const UserContext = createContext<UserContextProps>({
  currentUser: null,
  email: "",
  updateEmail: async () => {},
  setupUser: async () => {},
});

export const UserInfoId = "user";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(UserInfoId).then((user) => {
      if (!user) {
        return;
      }
      const rawUser = JSON.parse(user) as UserDbInfo;
      const deserializedUser: UserInfo = {
        ...rawUser,
        createdAt: new Date(rawUser.createdAt),
      };
      setUser(deserializedUser);
    });
  }, []);

  function serializeUser(user: UserInfo): string {
    return JSON.stringify({
      ...user,
      createdAt: user.createdAt.toISOString(),
    } as UserDbInfo);
  }

  async function updateEmail(newEmail: string) {
    if (!user) {
      return;
    }

    const newUser = { ...user, email: newEmail };
    await AsyncStorage.setItem(UserInfoId, serializeUser(newUser));
    setUser(newUser);
  }

  async function setupUser(user: UserInsertInfo) {
    const newUser = { ...user, createdAt: new Date() } as UserInfo;
    await AsyncStorage.setItem(UserInfoId, serializeUser(newUser));
    setUser(newUser);
  }

  const email = user?.email ?? "";

  return (
    <UserContext.Provider
      value={{
        currentUser: !user ? null : { ...user, id: email },
        email: email,
        updateEmail,
        setupUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
