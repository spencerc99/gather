import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// TODO: fill out user
export function currentUser() {
  const [email, setEmail] = useEmail();
  return { id: email };
}

export function useEmail(): [
  string | null | undefined,
  (email: string) => Promise<void>
] {
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

  return [email, updateEmail];
}
