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
      borderRadius={16}
      disabled={disabled}
    >
      New Collection
    </LinkButton>
  );
}
