import { createContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { getItem, setItem } from "./asyncStorage";
import { Block, RemoteSourceType } from "./dataTypes";
import { randomUUID } from "expo-crypto";
import {
  ArenaTokenStorageKey,
  RawArenaUser,
  getMyArenaUserInfo,
} from "./arena";
import { InteractionManager, Platform } from "react-native";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";
import { ensureUnreachable } from "./react";

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
  arenaAccessToken: string | null;
  updateArenaAccessToken: (newToken: string | null) => void;
  arenaUserInfo: RawArenaUser | null;
  email: string;
  updateEmail: (email: string) => Promise<void>;
  setupUser: (user: UserInsertInfo) => Promise<void>;
  isBlockCreatedByUser: (block: Block) => boolean | null;
  isBlockConnectedByUser: (block: Block) => boolean | null;
}

interface CreatedBy {
  source?: RemoteSourceType;
  userId: string;
}

export const UserContext = createContext<UserContextProps>({
  currentUser: null,
  arenaAccessToken: null,
  arenaUserInfo: null,
  updateArenaAccessToken: async () => {},
  email: "",
  updateEmail: async () => {},
  setupUser: async () => {},
  isBlockCreatedByUser: () => null,
  isBlockConnectedByUser: () => null,
});

export const UserInfoId = "user";

export function getCreatedByForRemote(source: RemoteSourceType, id: string) {
  return `${source}:::${id}`;
}

export function extractCreatorFromCreatedBy(createdBy: string): CreatedBy {
  const split = createdBy.split(":::");
  if (split.length === 1) {
    // local block
    return { userId: createdBy };
  }
  const [source, userId] = split;
  if (source === RemoteSourceType.Arena) {
    return { source: RemoteSourceType.Arena, userId };
  }
  throw new Error(`Unknown createdBy source: ${source}`);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [arenaAccessToken, setArenaAccessToken] = useState<string | null>(null);
  const [arenaUserInfo, setArenaUserInfo] = useState<RawArenaUser | null>(null);

  async function getArenaAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ArenaTokenStorageKey);
  }

  async function updateArenaAccessToken(newToken: string | null) {
    // TODO: handle web
    if (Platform.OS !== "web") {
      if (newToken === null) {
        await SecureStore.deleteItemAsync(ArenaTokenStorageKey);
      } else {
        await SecureStore.setItemAsync(ArenaTokenStorageKey, newToken);
      }
    }
    setArenaAccessToken(newToken);
  }

  useEffect(() => {
    InteractionManager.runAfterInteractions(async () => {
      getArenaAccessToken().then((accessToken) => {
        setArenaAccessToken(accessToken);
      });
    });
  }, []);

  useEffect(() => {
    if (!arenaAccessToken) {
      return;
    }
    getMyArenaUserInfo(arenaAccessToken).then((userInfo) => {
      setArenaUserInfo(userInfo);
    });
  }, [arenaAccessToken]);

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

  function isBlockCreatedByUser(block: Block): boolean | null {
    const { createdBy } = block;
    const { userId, source } = extractCreatorFromCreatedBy(createdBy);
    if (!source) {
      return true;
    }

    switch (source) {
      case RemoteSourceType.Arena:
        if (!arenaUserInfo) {
          return null;
        }
        return Boolean(arenaUserInfo && userId === arenaUserInfo.slug);
      default:
        return ensureUnreachable(source);
    }
  }

  function isBlockConnectedByUser(block: Block): boolean | null {
    const { connectedBy } = block;
    if (!connectedBy) {
      return null;
    }
    const { userId, source } = extractCreatorFromCreatedBy(connectedBy);
    if (!source) {
      return true;
    }

    switch (source) {
      case RemoteSourceType.Arena:
        if (!arenaUserInfo) {
          return null;
        }
        return Boolean(arenaUserInfo && userId === arenaUserInfo.slug);
      default:
        return ensureUnreachable(source);
    }
  }

  const email = user?.email ?? "";

  return (
    <UserContext.Provider
      value={{
        currentUser: !user ? null : { ...user },
        email: email,
        updateEmail,
        setupUser,
        arenaAccessToken,
        updateArenaAccessToken,
        arenaUserInfo,
        isBlockCreatedByUser,
        isBlockConnectedByUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
