-- Matching Game Examples
INSERT INTO public.matching_game_questions (left_text, right_text, level, is_active, stage) VALUES
('الذهب', 'Au', 1, true, 'default'),
('الفضة', 'Ag', 1, true, 'default'),
('الحديد', 'Fe', 1, true, 'default'),
('النحاس', 'Cu', 1, true, 'default'),
('الأكسجين', 'O', 1, true, 'default'),
('الهيدروجين', 'H', 1, true, 'default');

-- Ordering Game Examples
INSERT INTO public.ordering_game_questions (title, items, correct_order, drop_labels, level, is_active, stage) VALUES
(
    'رتب الكواكب حسب بعدها عن الشمس (من الأقرب للأبعد)',
    '["الأرض", "عطارد", "المريخ", "الزهرة"]',
    '["عطارد", "الزهرة", "الأرض", "المريخ"]',
    '["1", "2", "3", "4"]',
    1,
    true,
    'default'
),
(
    'رتب مراحل نمو الإنسان',
    '["كهولة", "طفولة", "شباب", "شيخوخة"]',
    '["طفولة", "شباب", "كهولة", "شيخوخة"]',
    '["1", "2", "3", "4"]',
    1,
    true,
    'default'
);

-- Speed Challenge Examples
INSERT INTO public.speed_challenge_questions (question_text, choice1, choice2, choice3, choice4, correct_choice_index, level, is_active, stage) VALUES
('كم عدد ألوان قوس قزح؟', '5', '6', '7', '8', 3, 1, true, 'default'),
('ما هي عاصمة السعودية؟', 'الرياض', 'جدة', 'مكة', 'الدمام', 1, 1, true, 'default'),
('ما هو ناتج 5 × 6؟', '30', '25', '35', '20', 1, 1, true, 'default'),
('أي مما يلي يعتبر من الثدييات؟', 'القرش', 'الدولفين', 'التمساح', 'النسر', 2, 1, true, 'default');
