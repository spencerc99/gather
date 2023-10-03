import { LinkButton } from "./common";

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
