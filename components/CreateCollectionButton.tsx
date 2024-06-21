import { LinkButton, LinkButtonProps } from "./Themed";

export function CreateCollectionButton({
  disabled,
  ...rest
}: Partial<LinkButtonProps>) {
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
      {...rest}
    >
      New Collection
    </LinkButton>
  );
}
