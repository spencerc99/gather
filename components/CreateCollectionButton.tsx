import { LinkButton } from "./Themed";

export function CreateCollectionButton() {
  return (
    <LinkButton
      href="/modal"
      title="Create Collection"
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
}
