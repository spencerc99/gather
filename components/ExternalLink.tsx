// ABOUTME: Opens external URLs in a new web tab or the native in-app browser.
// ABOUTME: Preserves Expo Router link behavior while handling platform navigation.
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      // On web, launch the link in a new tab.
      target="_blank"
      {...props}
      href={props.href as React.ComponentProps<typeof Link>['href']}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(props.href as string);
        }
      }}
    />
  );
}
