import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import { Spinner, YStack } from "tamagui";

// waits for animations to finish before launching component

export const afterAnimations =
  (Component: ({ ...props }) => JSX.Element) =>
  ({ ...props } = {}) => {
    const [animationsDone, setAnimationsDone] = useState(false);

    useEffect(() => {
      setAnimationsDone(false);
      InteractionManager.runAfterInteractions(() => {
        setAnimationsDone(true);
      });
    }, []);

    if (!animationsDone)
      return (
        <YStack justifyContent="center" alignItems="center" flexGrow={1}>
          <Spinner size="large" color="$orange9" />
        </YStack>
      );

    return <Component {...props} />;
  };
