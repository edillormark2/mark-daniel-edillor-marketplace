-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_messages (
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.chat_sessions (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.messages (
  post_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_email character varying NOT NULL,
  sender_name character varying NOT NULL,
  recipient_id uuid NOT NULL,
  recipient_email character varying NOT NULL,
  subject character varying NOT NULL,
  message text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id),
  CONSTRAINT messages_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.posts (
  title text NOT NULL,
  description text NOT NULL,
  price numeric,
  main_category text NOT NULL,
  sub_category text NOT NULL,
  campus text NOT NULL,
  seller_id uuid NOT NULL,
  seller_name text NOT NULL,
  seller_email text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  photos ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  stripe_product_id text,
  stripe_price_id text,
  seller_stripe_account_id text,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_seller_stripe_account_id_fkey FOREIGN KEY (seller_stripe_account_id) REFERENCES public.seller_accounts(stripe_account_id),
  CONSTRAINT posts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  university text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.seller_accounts (
  user_id uuid NOT NULL UNIQUE,
  stripe_account_id text UNIQUE,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  onboarding_completed boolean DEFAULT false,
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  details_submitted boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT seller_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT seller_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.transaction_status_history (
  transaction_id uuid NOT NULL,
  status text NOT NULL,
  reason text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transaction_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_status_history_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transactions (
  stripe_payment_intent_id text NOT NULL UNIQUE,
  stripe_charge_id text,
  post_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  seller_stripe_account_id text NOT NULL,
  amount integer NOT NULL,
  platform_fee integer NOT NULL,
  seller_amount integer NOT NULL,
  payment_method_type text,
  stripe_transfer_id text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  currency text DEFAULT 'usd'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_seller_stripe_account_id_fkey FOREIGN KEY (seller_stripe_account_id) REFERENCES public.seller_accounts(stripe_account_id),
  CONSTRAINT transactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.webhook_events (
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  error text,
  payload jsonb NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  processed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT webhook_events_pkey PRIMARY KEY (id)
);