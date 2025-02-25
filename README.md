# Gather


https://github.com/user-attachments/assets/66c510f4-7d62-43cc-8b61-f7432d42cb9b


a handheld companion for your curiosity, a local-first client for collecting, curating, and cultivating multimedia collections.

Available on the [App Store]([url](https://apps.apple.com/us/app/gather-handheld-curiosity/id6468843059?platform=iphone)) and [Google Play Store](https://play.google.com/store/apps/details?id=net.tiny_inter.gather&hl=en_US )

## Development

- run `npm install` to install dependencies
- `npx expo start` starts development servers cross-platform

### Adding Data Sources
I still have to do some setup work to make this really easy, but you can refer to all the Are.na code for adapters to making this work. See `arena.ts` for syncing data and arena logic in `db.ts`.

### IOS

if you add any native plugins, make sure to run

```
npm run prebuild
npm run ios
```

### Are.na

To develop with Are.na syncing, you must set up a proper .env file with your own Are.na keys. Please message me if you want this, and I can help you set it up

### Release

#### IOS

in order to release a new version, you have to bump the version in `app.json` and then run

```bash
npm run build-ios
```

this will produce a file like `build-1698192300094.ipa` inside the `builds` folder which you can then provide to `eas submit`.

```bash
eas submit -p ios
```

provide the filepath and then it will submit it to testflight automatically.

## Common Errors

### `npm run ios` fails with `CommandError: Failed to build iOS project. "xcodebuild" exited with error code 65. Duplicate tasks error.`

open `ios` folder in XCode and delete duplicate ShareExtension tasks. re-run.

### `npm run build-ios` fails with `See Xcode logs for full errors`

run EAS_LOCAL_BUILD_SKIP_CLEANUP=1 npm run build-ios to keep logs around in local `logs`. inspect the logs to see what went wrong.
