# TheBoringStack - Marketing Architecture Blueprint

A professional Marketing Architecture generator powered by DeepSeek R1 and OpenAI, designed for small businesses to build reliable growth infrastructure.

## 🚀 Deployment (Vercel Only)

This project is optimized for deployment on **Vercel**.

### 1. Database Setup (Supabase)
This project uses **Supabase** for persistence in production.
- Create a new project on [Supabase](https://supabase.com/).
- Run the following SQL in your Supabase SQL Editor:
  ```sql
  create table public.subscribers (
    email text primary key,
    name text,
    total_queries integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
  );

  create table public.marketing_queries (
    id uuid default gen_random_uuid() primary key,
    email text references public.subscribers(email),
    query_text text not null,
    ai_output text not null,
    lead_score integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
  );

  create table public.marketing_blueprints (
    id text primary key,
    business_name text not null,
    input_data jsonb not null,
    ai_output jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
  );
  ```

### 2. Environment Variables
Add the following to your Vercel Project Settings:
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Found in Settings -> API).
- `OPENROUTER_API_KEY`: Your OpenRouter API Key for DeepSeek/GPT access.
- `RESEND_API_KEY`: Your Resend API Key for sending blueprints.

### 3. Local Development
```bash
# Install dependencies
npm install

# Run the dev server
npm run dev
```
In local development, the app will automatically fall back to a local `blueprints.db` (SQLite) if Supabase credentials are not provided.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Framer Motion, Lucide Icons.
- **Backend**: Express (Vercel Serverless Functions).
- **Database**: Supabase (PostgreSQL) / SQLite (Fallback).
- **AI**: DeepSeek R1, OpenAI GPT-4o-mini (via OpenRouter).
- **Email**: Resend.

## 📄 License
MIT
