### Mapbox GL JS setup in Next.js (MonkeDao frontend)

Follow these steps to enable the 3D globe map under `events/globe`:

- **Install dependency**:

```bash
cd MONKE/frontend && npm install mapbox-gl
```

- **Add your Mapbox token to Next.js env**:

Create or edit `MONKE/frontend/.env.local` and add:

```bash

```

Notes:
- The `NEXT_PUBLIC_` prefix is required so the token is available to client-side code in Next.js.
- Restart the dev server after adding or changing `.env.local`.

- **Run the dev server**:

```bash
cd MONKE/frontend
npm run dev
```

- **Open the globe**:

Visit `http://localhost:3000/events/globe` to view the 3D globe with plotted crypto events (fetched from `/api/events?filter=all`).


