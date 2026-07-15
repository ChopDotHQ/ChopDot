# Optional Polkadot iOS reference host setup - 2026-07-14

## Status

`optional_not_required`

Full Xcode is not a ChopDot prerequisite and is not on the active critical
path. Building Parity's community iOS source is only an optional fallback for
obtaining a runnable Polkadot Mobile client before an official distributed
build becomes available.

## Checked

```text
$ xcodebuild -version
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer
directory '/Library/Developer/CommandLineTools' is a command line tools instance

$ xcrun simctl list devices
xcrun: error: unable to find utility "simctl", not a developer tool or in PATH
```

The Mac currently has Apple Command Line Tools only. A UIKit app and iOS
Simulator cannot be built or run from this state.

## Optional source-build route

Use this route only if we explicitly decide to build the reference client
ourselves:

1. Install full Xcode from the Mac App Store or Apple Developer downloads.
2. Select it:

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

3. Launch Xcode once, accept the licence, and install an iOS Simulator runtime.
4. Clone `paritytech/polkadot-ios-community` into a separate reference-host
   workspace.
5. Follow the repository's publishing/build instructions and run the host in a
   simulator before connecting ChopDot.

Do not install Xcode merely to continue current ChopDot development. The
official Host API Test SDK remains the active local integration environment.

## Architecture decision

ChopDot remains a portable React product. The Parity UIKit/VIPER application is
the host and conformance reference, not an architecture to copy into ChopDot.
The integration boundary is the Product SDK inside the hosted web product.
