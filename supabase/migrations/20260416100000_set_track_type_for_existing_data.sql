-- Migration: Set track_type = 'nafis' for all existing game questions
-- This separates existing Nafis questions from future Central Exam questions
-- No data is deleted, only categorized

-- Update matching_game_questions
update public.matching_game_questions
set track_type = 'nafis'
where track_type is null;

-- Update ordering_game_questions
update public.ordering_game_questions
set track_type = 'nafis'
where track_type is null;

-- Update speed_challenge_questions
update public.speed_challenge_questions
set track_type = 'nafis'
where track_type is null;

-- Update stages_game_questions
update public.stages_game_questions
set track_type = 'nafis'
where track_type is null;

-- Update wheel_sections
update public.wheel_sections
set track_type = 'nafis'
where track_type is null;

-- Update wheel_section_questions
update public.wheel_section_questions
set track_type = 'nafis'
where track_type is null;

-- Update questions (nafis questions bank)
update public.questions
set track_type = 'nafis'
where track_type is null;

-- Add default value for future inserts
alter table public.matching_game_questions 
alter column track_type set default 'nafis';

alter table public.ordering_game_questions 
alter column track_type set default 'nafis';

alter table public.speed_challenge_questions 
alter column track_type set default 'nafis';

alter table public.stages_game_questions 
alter column track_type set default 'nafis';

alter table public.wheel_sections 
alter column track_type set default 'nafis';

alter table public.wheel_section_questions 
alter column track_type set default 'nafis';

alter table public.questions 
alter column track_type set default 'nafis';
