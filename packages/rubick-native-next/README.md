# rubick-native-next

An in-repo native runtime package for Rubick Next.

This package is intended to be a clean-room implementation of the native
capabilities Rubick Next actually needs, without depending on the upstream
`rubick-native` package design or release process.

## Goals

1. Own the API boundary used by this repository.
2. Implement only the native capabilities that Rubick Next needs.
3. Prefer Windows-first delivery, then expand to macOS and Linux.
4. Avoid coupling app code to third-party native package APIs.

## Planned Capability Areas

- folder open path detection
- active window inspection
- keyboard simulation
- input event subscription
- clipboard helpers

## Current Module Layout

- `src/system`
  Windows/macOS/Linux system-facing capabilities such as folder path detection
  and active window lookup.
- `src/input`
  Keyboard simulation and global input event subscription.
- `src/clipboard`
  Clipboard-facing helpers exposed through a stable package API.
- `src/shared`
  Shared internal helpers used by the package implementation.
- `native/`
  Reserved for clean-room Rust/N-API implementations. The first scaffold is for
  Windows active window lookup. A local loader and build scripts now exist, and
  the package build will auto-compile the addon when Rust is available.

## Initial Migration Targets

1. Replace `@nut-tree/nut-js`
2. Evaluate replacing `uiohook-napi`
3. Keep `cdwhere.exe` until a native Windows implementation is proven reliable

## Design Rules

1. Export stable project-owned types.
2. Hide platform-specific implementation details behind small adapters.
3. Do not expose third-party package return shapes directly.
4. Listener APIs must support unsubscribe from day one.

## Current Status

The package is now wired into the repository as the project-owned native API
boundary for the currently migrated capabilities.

Current integration status:

- superx copy shortcut now routes through `input.sendCopyShortcut`
- superx active-window fallback now routes through `system.getActiveWindow`
- main-process double-press shortcut handling now routes through
  `input.onInputEvent`
- superx mouse trigger handling now routes through `input.onInputEvent`
- main-process keyboard tap simulation now routes through
  `input.sendKeyboardTap`

Current intentionally retained fallbacks:

- `input.sendCopyShortcut` and `input.sendKeyboardTap` still reuse
  `@nut-tree/nut-js`
- `input.onInputEvent` still adapts `uiohook-napi`
- `system.getFolderOpenPath` and `system.getFolderOpenPathSync` still use the
  verified `cdwhere.exe` path on Windows
- `clipboard.getClipboardContent` still prefers `electron-clipboard-ex` on
  Windows when it is available

Implemented first:

- `input.sendCopyShortcut`
  First implementation currently reuses the repository's proven
  `@nut-tree/nut-js` flow and sends:
  - macOS: `Command + C`
  - other platforms: `Control + C`
  This keeps business integration stable while the package-owned API boundary is
  established.
- `input.sendKeyboardTap`
  General keyboard simulation is now also routed through the same package-owned
  input layer, so main-process callers no longer need to import
  `node-key-sender` directly.
- `input.onInputEvent`
  First implementation adapts `uiohook-napi` behind a shared subscription
  layer. The package now exposes unsubscribe callbacks even though the app code
  no longer needs to depend on `uIOhook` directly.
- `system.getActiveWindow`
  The current implementation now uses the package-owned Windows native binding
  directly and returns `null` on non-Windows platforms for now.
- `system.getFolderOpenPath`
  First implementation keeps the currently verified Windows `cdwhere.exe`
  strategy, resolved from development and packaged app locations. This keeps
  the API inside `rubick-native-next` without regressing Explorer path lookup.
- `clipboard.getClipboardContent`
  First implementation reads from Electron's clipboard and returns:
  - `file` when file paths are present
  - `text` when plain text is present
  - `null` otherwise
  On Windows it prefers `electron-clipboard-ex` when available, then falls back
  to Electron clipboard formats.

First implementation targets:

1. business-layer integration and verification
2. preserving existing behavior while shrinking direct app-level dependencies

## Native Build

The native layer is still optional. `pnpm --filter rubick-native-next run build`
will attempt to compile it automatically when `cargo` is available. You can
also build the Windows addon manually with:

```bash
pnpm --filter rubick-native-next run native:build
```

This compiles the Rust crate and copies the resulting addon to:

- `packages/rubick-native-next/native/rubick_native_next.node`

At runtime, the TypeScript layer will:

1. use the native addon on Windows by default
2. return `null` when the addon is unavailable or when running on a platform
   that does not yet have an in-repo implementation

When the target `.node` file is locked by a running process, the build script
now keeps the existing addon file instead of failing the whole package build.
