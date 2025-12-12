# iOS Templates

This directory contains iOS-specific files that need to be copied to the iOS project after running `npx cap sync ios`.

## Files

- `AnimatedSplashViewController.swift` - Custom animated splash screen view controller
- `AppDelegate.patch` - Shows the changes needed to AppDelegate.swift to use the animated splash screen

## Setup

After running `npx cap sync ios`, run:

```bash
npm run ios:setup-splash
```

Or it will run automatically when you use:

```bash
npm run ios:sync
npm run ios:build
```

## Manual Setup

If the automatic script doesn't work, you can manually add the file in Xcode:

1. Run `npm run ios:setup-splash` to copy the file to the iOS project
2. Open `ios/App/App.xcworkspace` in Xcode
3. Right-click on the `App/App` folder in the Project Navigator
4. Select "Add Files to App..."
5. Navigate to `ios/App/App/` and select `AnimatedSplashViewController.swift`
6. Make sure "Copy items if needed" is **UNCHECKED** (file already exists)
7. Make sure "Create groups" is selected
8. Make sure the "App" target is checked
9. Click "Add"
10. Update `AppDelegate.swift` with the changes shown in `AppDelegate.patch`

