# Vendored Curialy UI packages

These two files are the app's design system, kept in the repository so
`npm install` and `npm ci` need nothing except the public npm registry:

| File | Package | Licence |
|---|---|---|
| `curialy-ui-0.7.16.tgz` | `@curialy/ui` 0.7.16 (components and themes) | MIT (see `package/LICENSE` inside the file) |
| `curialy-ui-theme-butter-0.7.16.tgz` | `@curialy/ui-theme-butter` 0.7.16 (the base theme) | MIT (see `package/LICENSE` inside the file) |

They are byte-for-byte the official release files; their sha512 is recorded in
`package-lock.json` (`integrity`), and npm checks it on every install:

| File | sha512 |
|---|---|
| `curialy-ui-0.7.16.tgz` | `Hm3ZoduO0py8MAEHW0gnvOvyT+PM+qVMHGuwVQ9MwfqUOsiYKXYcRdu6RbNIztxbXcmmgwLS59VbqfoZXwHWnA==` |
| `curialy-ui-theme-butter-0.7.16.tgz` | `C+jwrbFf7WcOb9fzlJo5hz72SLASVejePshPZoYdX0jLc6SvA0cieIta5UdAUchcXIrWBXyQgHmHv5F+WIXpdg==` |

To check a file yourself: `openssl dgst -sha512 -binary <file> | base64 -w0`.

`package.json` points at them with `file:vendor/curialy/<name>.tgz`.

## Upgrading

1. Replace **both** files with the same newer version (the theme only works with the
   core release of the same number), keeping the file names' pattern.
2. Update the two `file:` paths in `package.json` to the new file names.
3. Run `npm install`, then `npm test` and `npm run build`.
4. Delete the old `.tgz` files and commit the new ones together with `package.json`
   and `package-lock.json`.
