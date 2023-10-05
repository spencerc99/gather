import { LinkButton } from "./Themed";

export function CreateCollectionButton({ disabled }: { disabled?: boolean }) {
  return (
    <LinkButton
      href="/modal"
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      disabled={disabled}
    >
      Create Collection
    </LinkButton>
  );
}
