# Geocoder

Capacitor plugin for geocoding (address to coordinates) and reverse geocoding (coordinates to address).

**Package:** `@capawesome-team/capacitor-geocoder`

**Platforms:** Android, iOS, Web

**Availability:** [Capawesome Insiders](https://capawesome.io/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install:

```bash
npm install @capawesome-team/capacitor-geocoder universal-geocoder
npx cap sync
```

No platform-specific configuration required.

## Usage

### Geocode (Address to Coordinates)

```typescript
import { Geocoder } from '@capawesome-team/capacitor-geocoder';

const geocode = async () => {
  const result = await Geocoder.geocode({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
  });
  console.log(result.latitude, result.longitude);
};
```

### Reverse Geocode (Coordinates to Address)

```typescript
const geodecode = async () => {
  const result = await Geocoder.geodecode({
    latitude: 37.422,
    longitude: -122.084,
  });
  console.log(result.addresses);
};
```

## Key Options

### Geocode Options

- `address`: The address to geocode.
- `locale`: BCP 47 language tag for the request.
- `webProvider`: `'googlemaps'` or `'openstreetmaps'` (default, Web only).
- `webApiKey`: API key for web geocoding service (Web only).

### Geodecode Options

- `latitude` / `longitude`: Coordinates to reverse geocode.
- `limit`: Maximum number of results (default: 5).
- `webProvider`: `'googlemaps'` or `'openstreetmaps'` (default, Web only).

## Notes

- On Android and iOS, native geocoding services are used.
- On Web, Google Maps or OpenStreetMap (Nominatim) can be used as providers.
- When using OpenStreetMap on Web, set `webUserAgent` to identify your application per Nominatim usage policy.
- Returned address fields include `adminArea`, `countryCode`, `countryName`, `postalCode`, `subAdminArea`, `addressLines`, and more.
