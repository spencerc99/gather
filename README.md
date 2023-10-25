# gather

a client for the forage protocol and a local-first Are.na client.

## Development

- run `npm install` to install dependencies
- `npx expo start` starts development servers cross-platform

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
