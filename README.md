# Yukta Nashik - Experiential Learning Platform

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Database Setup

This project uses Prisma ORM and supports both SQLite (for development) and PostgreSQL (for production).

### Development (SQLite)

1. The default configuration uses SQLite for development
2. Make sure you have the `.env` file with:
   ```
   DATABASE_PROVIDER=sqlite
   DATABASE_URL="file:./dev.db"
   ```
3. The Prisma schema is configured to work with SQLite in development
4. Run `npx prisma migrate dev` to set up the database
5. Run `npx prisma studio` to view and manage the database

### Production (PostgreSQL)

1. Set up a PostgreSQL database
2. Update the `.env` file with your PostgreSQL connection string:
   ```
   DATABASE_PROVIDER=postgresql
   DATABASE_URL="postgresql://username:password@hostname:5432/database_name?schema=public"
   ```
3. Make sure the `prisma/schema.prisma` file has `provider = "postgresql"`
4. Run `npx prisma migrate deploy` to apply migrations to the production database
5. Set `NEXTAUTH_URL` to your production domain

## Environment Variables

Copy `.env.example` to `.env` and modify the values as needed:

```
# Database Configuration
# For SQLite (development):
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./dev.db"

# For PostgreSQL (production/staging):
# DATABASE_PROVIDER=postgresql
# DATABASE_URL="postgresql://username:password@hostname:5432/database_name?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"

# Add other environment variables as needed for your deployment
# Example:
# NEXT_PUBLIC_API_URL="https://your-domain.com/api"
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

When deploying to Vercel:
1. Set the environment variables in the Vercel dashboard
2. Make sure to use the PostgreSQL database connection string
3. Set `NEXTAUTH_URL` to your Vercel deployment URL
4. The platform will automatically run `next build` and `next start`

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
