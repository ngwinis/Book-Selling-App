-- Fix Supabase REST API visibility for this local/student backend.
-- Run in Supabase SQL Editor after schema + seed data.

alter table public."Customer" disable row level security;
alter table public."Authors" disable row level security;
alter table public."Categories" disable row level security;
alter table public."Publishers" disable row level security;
alter table public."Book" disable row level security;
alter table public."BookImages" disable row level security;
alter table public."BookAuthor" disable row level security;
alter table public."BookCategory" disable row level security;
alter table public."BookPublisher" disable row level security;
alter table public."Address" disable row level security;
alter table public."Payment" disable row level security;
alter table public."OTP" disable row level security;
alter table public."Review" disable row level security;
alter table public."Cart" disable row level security;
alter table public."CartItem" disable row level security;
alter table public."Voucher" disable row level security;
alter table public."Shipment" disable row level security;
alter table public."Order" disable row level security;
alter table public."OrderItem" disable row level security;
alter table public."ViewHistory" disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Verify what the REST API role can see.
set local role anon;
select 'Categories' as table_name, count(*) as row_count from public."Categories"
union all select 'Book', count(*) from public."Book"
union all select 'BookImages', count(*) from public."BookImages"
union all select 'Customer', count(*) from public."Customer";
reset role;

