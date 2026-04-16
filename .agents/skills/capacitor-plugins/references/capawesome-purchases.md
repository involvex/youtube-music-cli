# Purchases

Capacitor plugin for in-app purchases. Supports subscriptions, consumables, and non-consumable products using StoreKit 2 (iOS) and Google Play Billing Library 8.0 (Android).

**Package:** `@capawesome-team/capacitor-purchases`
**Platforms:** Android, iOS
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-purchases
npx cap sync
```

## Configuration

### Android

#### Variables

Defined in `android/variables.gradle`:

- `$googlePlayBillingVersion` version of `com.android.billingclient:billing` (default: `8.2.0`)

### iOS

#### Capabilities

Enable the `In-App Purchase` capability in Xcode under Signing & Capabilities. See [Add a capability to a target](https://help.apple.com/xcode/mac/current/#/dev88ff319e7).

## Usage

### Purchase a product

```typescript
import { Purchases } from '@capawesome-team/capacitor-purchases';

const { transaction } = await Purchases.purchaseProduct({ productId: 'my_product_id' });
// Deliver the purchased content or enable the service
// ...
// Finish the transaction
await Purchases.finishTransaction({ transactionId: transaction.id });
```

### Get product details

```typescript
import { Purchases } from '@capawesome-team/capacitor-purchases';

const { product } = await Purchases.getProductById({ productId: 'my_product_id' });
console.log('Name:', product.displayName);
console.log('Price:', product.displayPrice);
console.log('Type:', product.type);
```

### Restore purchases

```typescript
import { Purchases } from '@capawesome-team/capacitor-purchases';

await Purchases.syncTransactions();
const { transactions } = await Purchases.getCurrentTransactions();
for (const transaction of transactions) {
  // Deliver the purchased content or enable the service
}
```

### Check for unfinished transactions

```typescript
import { Purchases } from '@capawesome-team/capacitor-purchases';

const { transactions } = await Purchases.getUnfinishedTransactions();
for (const transaction of transactions) {
  // Process and finish the transaction
  await Purchases.finishTransaction({ transactionId: transaction.id });
}
```

### Check intro offer eligibility

```typescript
import { Purchases } from '@capawesome-team/capacitor-purchases';

const { isIntroOfferAvailable } = await Purchases.isIntroOfferAvailableForProduct({
  productId: 'my_subscription_id',
});
```

## Notes

- Always call `finishTransaction()` after delivering purchased content or enabling the service.
- Check for unfinished transactions at every app launch to ensure all transactions are processed.
- `syncTransactions()` on iOS displays a system authentication dialog; only call it in response to an explicit user action. On Android it runs silently.
- `getAllTransactions()` is only available on iOS.
- On Android, `purchaseProduct()` supports `basePlanId` and `offerId` for subscription offers.
- Server-side validation: iOS provides JWS via `transaction.verificationResult`; Android provides `transaction.token`, `transaction.originalJson`, and `transaction.signature`.
- For Android testing: upload the app to Google Play Console (internal testing track), add test accounts under License Testing, and install from Google Play.
- For iOS testing: use Sandbox test accounts or StoreKit Testing in Xcode.
