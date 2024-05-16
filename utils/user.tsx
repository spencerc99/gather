import { createContext, useEffect, useState } from "react";
import { getItem, setItem } from "./asyncStorage";
import { RemoteSourceType } from "./dataTypes";
import { randomUUID } from "expo-crypto";

// TODO: add uuid based on device? https://docs.expo.dev/versions/latest/sdk/application/?redirected#applicationgetandroidid or just uuid.. and back it up to native cloud service
interface UserInsertInfo {
  email: string;
}

interface UserDbInfo extends UserInsertInfo {
  id: string;
  createdAt: string;
}

export interface UserInfo extends UserInsertInfo {
  id: string;
  createdAt: Date;
}

interface UserContextProps {
  currentUser: UserInfo | null;
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

export function getCreatedByForRemote(source: RemoteSourceType, id: string) {
  return `${source}:::${id}`;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    let user = getItem<UserDbInfo>(UserInfoId);
    if (!user) {
      return;
    }
    // TODO: REMOVE AFTER EVERYONE MIGRATED
    if (!user.id) {
      user = { ...user, id: randomUUID() };
      setItem(UserInfoId, user);
    }

    const deserializedUser: UserInfo = {
      ...user,
      createdAt: new Date(user.createdAt),
    };
    setUser(deserializedUser);
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
    setItem(UserInfoId, serializeUser(newUser));
    setUser(newUser);
  }

  async function setupUser(user: UserInsertInfo) {
    const newUser = {
      ...user,
      createdAt: new Date(),
      id: randomUUID(),
    } as UserInfo;
    setItem(UserInfoId, serializeUser(newUser));
    setUser(newUser);
  }

  const email = user?.email ?? "";

  return (
    <UserContext.Provider
      value={{
        currentUser: !user ? null : { ...user },
        email: email,
        updateEmail,
        setupUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
