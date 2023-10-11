import { Separator, SizableText, Tabs, TabsContentProps, Theme } from "tamagui";
import { TextForageView } from "../../../components/TextForageView";
import { CollectionChatsView } from "../../../views/CollectionChatsView";

export default function HomeScreen() {
  return (
    <Tabs
      defaultValue="unsorted"
      orientation="horizontal"
      flexDirection="column"
      borderRadius="$4"
      borderWidth="$0.25"
      height="100%"
      overflow="hidden"
      borderColor="$borderColor"
    >
      <Tabs.List
        separator={<Separator vertical />}
        disablePassBorderRadius="bottom"
      >
        <Theme name="blue">
          <Tabs.Tab flex={1} value="unsorted">
            <SizableText>Unsorted</SizableText>
          </Tabs.Tab>
          <Tabs.Tab flex={1} value="collections">
            <SizableText>All</SizableText>
          </Tabs.Tab>
        </Theme>
      </Tabs.List>
      <TabsContent value="unsorted">
        <TextForageView />
      </TabsContent>
      <TabsContent value="collections">
        <CollectionChatsView />
      </TabsContent>
    </Tabs>
  );
}

const TabsContent = (props: TabsContentProps) => {
  return (
    <Tabs.Content flex={1} {...props}>
      {props.children}
    </Tabs.Content>
  );
};
