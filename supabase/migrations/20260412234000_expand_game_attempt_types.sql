DO $$
DECLARE
    existing_values text[];
    constraint_name text;
    allowed_values text[];
    constraint_sql text;
BEGIN
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'game_attempts'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%game_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE game_attempts DROP CONSTRAINT %I', constraint_name);
    END IF;

    SELECT COALESCE(array_agg(DISTINCT game_type), ARRAY[]::text[])
    INTO existing_values
    FROM game_attempts;

    SELECT ARRAY(
        SELECT DISTINCT value
        FROM unnest(
            existing_values
            || ARRAY[
                'quick_quiz',
                'exam',
                'matching',
                'ordering',
                'speed',
                'stages',
                'wheel_science',
                'central_exam'
            ]
        ) AS value
    )
    INTO allowed_values;

    constraint_sql := 'ALTER TABLE game_attempts ADD CONSTRAINT game_attempts_game_type_check CHECK (game_type IN ('
        || array_to_string(
            ARRAY(SELECT quote_literal(value) FROM unnest(allowed_values) AS value),
            ', '
        )
        || '))';

    EXECUTE constraint_sql;
END $$;
