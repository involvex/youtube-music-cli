# Printer

Capacitor plugin for printing. Supports base64 data, files, HTML content, PDFs, and web view content.

**Package:** `@capawesome-team/capacitor-printer`
**Platforms:** Android, iOS, Web (web view printing only)
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-printer
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

#### Variables

Defined in `android/variables.gradle`:

- `$androidxDocumentFileVersion` version of `androidx.documentfile:documentfile` (default: `1.1.0`)
- `$androidxPrintVersion` version of `androidx.print:print` (default: `1.1.0`)

## Usage

### Print HTML content

```typescript
import { Printer } from '@capawesome-team/capacitor-printer';

await Printer.printHtml({
  name: 'My Document',
  html: '<h1>Hello World</h1>',
});
```

### Print a PDF file

```typescript
import { Printer } from '@capawesome-team/capacitor-printer';

await Printer.printPdf({
  name: 'My Document',
  path: '/path/to/document.pdf',
});
```

### Print base64 data

```typescript
import { Printer } from '@capawesome-team/capacitor-printer';

await Printer.printBase64({
  name: 'My Document',
  data: 'JVBERi0...',
  mimeType: 'application/pdf',
});
```

### Print the current web view

```typescript
import { Printer } from '@capawesome-team/capacitor-printer';

await Printer.printWebView({
  name: 'My Document',
});
```

### Print a file by path

```typescript
import { Printer } from '@capawesome-team/capacitor-printer';

await Printer.printFile({
  mimeType: 'application/pdf',
  path: 'content://com.android.providers.downloads.documents/document/msf%3A1000000485',
});
```

## Notes

- `printBase64()`, `printFile()`, `printHtml()`, and `printPdf()` are only available on Android and iOS.
- `printWebView()` works on all platforms. Use CSS print media queries (`@media print`) to customize print output.
- `printBase64()` supports these MIME types: `application/pdf`, `image/gif`, `image/heic`, `image/heif`, `image/jpeg`, `image/png`.
- Large files in `printBase64()` can cause app crashes; prefer `printFile()` for large files.
- The `name` property defaults to `'Document'` if not provided.
