import { Separator, SizableText, Tabs, TabsContentProps, Theme } from "tamagui";
import { TextForageView } from "../../../components/TextForageView";
import { CollectionChatsView } from "../../../views/CollectionChatsView";

export default function HomeScreen() {
  return (
    <Tabs
      defaultValue="unsorted"
      orientation="horizontal"
      flexDirection="column"
      borderWidth="$0.25"
      height="100%"
      overflow="hidden"
      borderColor="$borderColor"
    >
      <Tabs.List
        separator={<Separator vertical />}
        disablePassBorderRadius="bottom"
        boxShadow="0px 4px 4px 4px rgba(0, 0, 0, 0.4)"
        // NOTE: needed to ensure that content of the texts scrollview doesn't go on top of the tabs (this only happens when behavior = 'position')
        zIndex={10}
      >
        <Theme name="blue">
          <Tabs.Tab flex={1} value="unsorted">
            <SizableText>All</SizableText>
          </Tabs.Tab>
          <Tabs.Tab flex={1} value="collections">
            <SizableText>Collections</SizableText>
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
