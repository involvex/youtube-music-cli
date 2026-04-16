# Stripe

Stripe SDK bindings for Capacitor applications. Supports Payment Sheet, Payment Flow, Apple Pay, and Google Pay.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/stripe
npx cap sync
```

## Usage

```typescript
import { Stripe } from '@capacitor-community/stripe';

// Initialize with your publishable key
await Stripe.initialize({ publishableKey: 'pk_test_xxx' });

// --- Payment Sheet ---
await Stripe.createPaymentSheet({
  paymentIntentClientSecret: 'pi_xxx_secret_xxx',
  merchantDisplayName: 'My Store',
});
const { paymentResult } = await Stripe.presentPaymentSheet();

// --- Payment Flow (two-step: select then confirm) ---
await Stripe.createPaymentFlow({
  paymentIntentClientSecret: 'pi_xxx_secret_xxx',
  merchantDisplayName: 'My Store',
});
const { cardNumber } = await Stripe.presentPaymentFlow();
const { paymentResult: flowResult } = await Stripe.confirmPaymentFlow();

// --- Apple Pay ---
const isApplePayAvailable = await Stripe.isApplePayAvailable();
await Stripe.createApplePay({
  paymentIntentClientSecret: 'pi_xxx_secret_xxx',
  paymentSummaryItems: [{ label: 'Total', amount: 1000 }],
  merchantIdentifier: 'merchant.com.example',
  countryCode: 'US',
  currency: 'USD',
});
const { paymentResult: appleResult } = await Stripe.presentApplePay();

// --- Google Pay ---
const isGooglePayAvailable = await Stripe.isGooglePayAvailable();
await Stripe.createGooglePay({
  paymentIntentClientSecret: 'pi_xxx_secret_xxx',
});
const { paymentResult: googleResult } = await Stripe.presentGooglePay();
```

## Notes

- Full documentation available at [stripe.capacitorjs.jp](https://stripe.capacitorjs.jp/).
- `initialize()` accepts an optional `stripeAccount` for connected accounts.
- `handleURLCallback()` is required on iOS for redirect-based payment methods.
- Payment Sheet and Payment Flow both support `setupIntentClientSecret` as an alternative to `paymentIntentClientSecret` for saving payment methods without charging.
- `enableApplePay` / `enableGooglePay` flags can be set in `createPaymentFlow()` and `createPaymentSheet()` to enable wallet payment methods within those flows.
- `returnURL` should be set when using redirect-based payment methods.
- `style` option (`'alwaysLight'` or `'alwaysDark'`) controls the appearance on iOS.
- Events are available for each payment method (e.g., `PaymentSheetEventsEnum.Completed`, `PaymentFlowEventsEnum.Failed`, `ApplePayEventsEnum.Canceled`, `GooglePayEventsEnum.Loaded`).
