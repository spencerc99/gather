import { useContext, useState } from "react";
import { DatabaseContext } from "../utils/db";
import { InputWithIcon, StyledButton, StyledView } from "../components/Themed";
import { ScrollView, SizableText, XStack, YStack } from "tamagui";
import { CollectionSummary } from "../components/CollectionSummary";
import { Link, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { currentUser } from "../utils/user";

export function CollectionChatsView() {
  const { collections, createCollection } = useContext(DatabaseContext);
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();

  return (
    <YStack width="100%" height="100%">
      <YStack margin="$2">
        <InputWithIcon
          icon="search"
          placeholder="Search..."
          backgroundColor="$gray4"
          value={searchValue}
          onChangeText={(text) => setSearchValue(text)}
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
                createdBy: currentUser().id,
              });
              setSearchValue("");
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
        {/* TODO: Sort by last message, add some thing about last message */}
        {collections
          .filter((c) =>
            `${c.title}\n${c.description}}`.includes(`${searchValue}`)
          )
          .map((collection, idx) => (
            <Link
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
      </ScrollView>
    </YStack>
  );
}
