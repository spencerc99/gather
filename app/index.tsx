import { Redirect } from "expo-router";

export default function App() {
  console.log("redirecting!");
  // TODO: add login here if not logged in.
  return <Redirect href="/home" />;
}
