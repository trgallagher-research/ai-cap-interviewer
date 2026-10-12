-- Seed one study for Phase 1 testing. Fixed id so the respondent flow can point
-- at it via SEED_STUDY_ID before the creator UI (Phase 2) exists.
-- Run after schema.sql, in the Supabase SQL editor.

insert into studies (id, title, topic, guide, visibility, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'AI in education — pilot',
  'How educators and staff experience AI in their work',
  '{
    "strategy": "Open with broad, low-stakes questions about everyday work before narrowing to AI, letting concrete recent examples surface naturally. Stay non-directive and curious about both enthusiasm and hesitation.",
    "objectives": [
      { "id": "obj1", "text": "Understand the respondent''s role and typical work", "intent": "Context and rapport before AI specifics." },
      { "id": "obj2", "text": "Where and how AI shows up in their day-to-day", "intent": "Map actual usage, not attitudes." },
      { "id": "obj3", "text": "A concrete recent example of using AI and how it played out", "intent": "Ground it in lived experience." },
      { "id": "obj4", "text": "What they trust AI with vs deliberately keep hands-on", "intent": "Surface boundaries and why." },
      { "id": "obj5", "text": "Hopes and worries about where AI in their field is heading", "intent": "Forward-looking sentiment." }
    ]
  }'::jsonb,
  'controlled',
  'active'
)
on conflict (id) do nothing;
