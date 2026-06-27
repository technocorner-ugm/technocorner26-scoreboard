This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Multimedia Integration

Display URLs (each competition has its own room-1 / room-2):

- `/display/soccerbot/gedung-a/room-1`
- `/display/soccerbot/gedung-a/room-2`
- `/display/line-follower/gedung-b/room-1`
- `/display/line-follower/gedung-b/room-2`

Legacy URLs without a competition still work and default to Line Follower:

- `/display/gedung-a/room-1`
- `/display/room-1` (defaults to Gedung A)

JSON snapshots:

- `/api/scoreboard` (full state, all competitions and venues)
- `/api/scoreboard?venue=gedung-a`
- `/api/scoreboard?venue=gedung-a&room=room-1`
- `/api/scoreboard?competition=soccerbot&venue=gedung-a`
- `/api/scoreboard?competition=soccerbot`
- `/api/scoreboard/competitions/soccerbot`
- `/api/scoreboard/competitions/soccerbot?venue=gedung-a&room=room-1`

Realtime SSE:

```js
const source = new EventSource(
  "https://your-scoreboard.example/api/scoreboard/events?competition=soccerbot&venue=gedung-a&room=room-1"
);

source.addEventListener("scoreboard", (event) => {
  const state = JSON.parse(event.data);
  console.log(state);
});
```

Competition IDs:

- `line-follower`
- `soccerbot`
- `soccerbot-penalty`
- `sumobot-rc`
- `sumobot-auto`
- `transporter`

Competition feeds contain only the requested competition and can be filtered by venue or room.
Public GET and SSE responses include CORS headers for multimedia clients hosted on another origin.

Venue IDs are `gedung-a` and `gedung-b`. Each venue has independent `room-1` and
`room-2` state, so identical room numbers in different buildings do not overwrite each other.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
