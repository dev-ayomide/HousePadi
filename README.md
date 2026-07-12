# HousePadi

Immersive, XR-powered property inspection platform. HousePadi lets prospective tenants, homebuyers, businesses, and event planners virtually walk through homes, offices, and event venues before committing to a physical visit — cutting down on transportation costs, inspection fees, and wasted trips.

## What's in here

- Interactive 3D/XR property viewer (GLTF/GLB, collision-aware first-person navigation, point-of-interest hotspots, AR)
- Property listings across categories (apartments, event centers, public spaces) with agent/agency/vendor/developer roles
- Consumer contact-reveal and inspection-booking payments via ALATPay virtual accounts
- Agent/agency subscription plans, developer API access, and an embeddable viewer

## Stack

Next.js (App Router) + TypeScript + Tailwind, Supabase (auth/Postgres), Cloudflare R2 (asset storage), `@react-three/fiber`/`three` for the 3D viewer, Resend for email.

## Setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for database schema setup, storage configuration, and required environment variables.
