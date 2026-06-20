-- Category ordering, AI metadata columns, and Van Berg seed categories.

alter table public.categories
  add column if not exists sort_order integer not null default 0;

alter table public.threads
  add column if not exists ai_draft_subject text,
  add column if not exists ai_reasoning text;

-- Backfill sort order for existing rows (alphabetical fallback).
with ordered as (
  select id, row_number() over (order by created_at, name) - 1 as position
  from public.categories
  where status_id = 1
)
update public.categories c
set sort_order = ordered.position
from ordered
where c.id = ordered.id;

insert into public.categories (name, routing_rule, prompt_template, sort_order)
values
  (
    'Bezichtigingsverzoek',
    'E-mails waarin een prospect een bezichtiging van een woning wil inplannen.',
    'Beantwoord zakelijk en vriendelijk in het Nederlands. Stel één concreet datum/tijd-voorstel voor. Gebruik variabelen: afzender {{senderName}}, onderwerp {{subject}}, bericht {{body}}.',
    0
  ),
  (
    'Koopbod',
    'Formele koopbiedingen of onderhandelingen over een bod op een woning.',
    'Beantwoord voorzichtig en professioneel in het Nederlands, passend bij de huisstijl van Van Berg Makelaardij. Geen toezeggingen zonder overleg. Context: {{senderName}}, {{subject}}, {{body}}.',
    1
  ),
  (
    'Taxatieverzoek',
    'Verzoeken om taxatie of waardebepaling, vaak van banken of adviseurs.',
    'Bevestig ontvangst, geef aan wat jullie nodig hebben en een realistische doorlooptijd. Nederlands, professioneel. Afzender: {{senderName}}. Onderwerp: {{subject}}. Bericht: {{body}}.',
    2
  ),
  (
    'Klacht',
    'Klachten of ontevreden klanten over communicatie of service.',
    'Erken de klacht, toon empathie, bied concrete vervolgstappen en vraag om contact als dat nodig is. Nederlands, respectvol. {{senderName}} — {{subject}} — {{body}}.',
    3
  ),
  (
    'Spam / sales',
    'Ongewenste sales, cold outreach of duidelijk irrelevante berichten.',
    'Kort en afwijzend in het Nederlands, of markeer dat geen reactie nodig is. Geen uitgebreide uitleg. {{senderName}}, {{subject}}, {{body}}.',
    4
  ),
  (
    'Overig',
    'Fallback: e-mails die niet duidelijk in een andere categorie passen.',
    'Beantwoord behulpzaam in het Nederlands en vraag om verduidelijking als de vraag onduidelijk is. {{senderName}}, {{subject}}, {{body}}, thread: {{threadContext}}.',
    5
  )
on conflict (name) do update
set
  routing_rule = excluded.routing_rule,
  prompt_template = excluded.prompt_template,
  sort_order = excluded.sort_order;
