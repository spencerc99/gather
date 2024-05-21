// TODO: unused
import { useContext, useState } from "react";
import { DatabaseContext, useCollections } from "../utils/db";
import { SearchBarInput, StyledButton } from "../components/Themed";
import { ScrollView, SizableText, YStack } from "tamagui";
import { CollectionSummary } from "../components/CollectionSummary";
import { Link, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { CreateCollectionButton } from "../components/CreateCollectionButton";
import { UserContext } from "../utils/user";

export function CollectionChatsView() {
  const { createCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  const { currentUser } = useContext(UserContext);
  const router = useRouter();
  const { collections, isLoading } = useCollections(searchValue);

  return (
    <YStack width="100%" height="100%">
      <YStack margin="$2">
        <SearchBarInput
          backgroundColor="$gray4"
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
      </YStack>
      <ScrollView
        contentContainerStyle={{
          // TODO: must be a better way to have it actually scroll to the bottom and not get cut off...
          paddingBottom: 24,
        }}
      >
        {searchValue && (
          <StyledButton
            onPress={async () => {
              const newCollectionId = await createCollection({
                title: searchValue,
                createdBy: currentUser!.id,
              });
              setSearchValue("");
              // @ts-ignore
              router.push({
                pathname: "/collection/[id]/chat",
                params: { id: newCollectionId },
              });
            }}
            noTextWrap={true}
            height="auto"
            paddingVertical={16}
          >
            <SizableText
              userSelect="none"
              cursor="pointer"
              color="$color"
              size="$true"
            >
              New collection{" "}
              <SizableText style={{ fontWeight: 700 }}>
                {searchValue}
              </SizableText>
            </SizableText>
          </StyledButton>
        )}
        {/* TODO: add some thing about last message */}
        {collections?.map((collection, idx) => (
          <Link
            // @ts-ignore
            href={{
              pathname: "/collection/[id]/chat",
              params: { id: collection.id },
            }}
            key={collection.id}
            asChild
          >
            <Pressable>
              <CollectionSummary
                collection={collection}
                viewProps={{
                  borderWidth: 1,
                  borderTopWidth: idx === 0 ? 1 : 0,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                  borderColor: "$gray7",
                }}
              />
            </Pressable>
          </Link>
        ))}
        {!searchValue && <CreateCollectionButton />}
      </ScrollView>
    </YStack>
  );
}
