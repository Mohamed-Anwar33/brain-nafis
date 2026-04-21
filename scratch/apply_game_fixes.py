import os

def patch_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for target, replacement in replacements:
        if target in new_content:
            new_content = new_content.replace(target, replacement)
            print("Patched file successfully.")
        else:
            print("FAILED to patch file: target not found.")
            # Print a bit of the file to debug if needed
            # print(repr(new_content[:100]))
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

# 1. MatchingGame.tsx
matching_path = r'd:\مشاريع مستقل\موقع الاختبارات\brain-nafis\src\pages\games\MatchingGame.tsx'
matching_repls = [
    (
        'const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "matching_pairs_count").maybeSingle();\n            const limit = setting ? parseInt(setting.value) : 6;',
        'const limit = 5;'
    ),
    (
        '<Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 font-bold rounded-xl border-2">',
        '''<Button asChild className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-500/20">
                                <Link to="/games/stages" className="flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 ml-2" />
                                    الانتقال للمرحلة التالية
                                </Link>
                            </Button>
                            <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 font-bold rounded-xl border-2">'''
    )
]

# 2. OrderingGame.tsx
ordering_path = r'd:\مشاريع مستقل\موقع الاختبارات\brain-nafis\src\pages\games\OrderingGame.tsx'
ordering_repls = [
    (
        'const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "ordering_questions_limit").maybeSingle();\n            const limit = setting ? parseInt(setting.value) : 10;',
        'const limit = 5;'
    ),
    (
        '<Button onClick={restartGame} variant="outline" className="w-full h-12 text-lg rounded-xl font-bold border-2">',
        '''<Button asChild className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-500/20">
                            <Link to="/games/stages" className="flex items-center justify-center">
                                <Sparkles className="w-5 h-5 ml-2" />
                                الانتقال للمرحلة التالية
                            </Link>
                        </Button>
                        <Button onClick={restartGame} variant="outline" className="w-full h-12 text-lg rounded-xl font-bold border-2">'''
    )
]

# 3. SpeedChallenge.tsx
speed_path = r'd:\مشاريع مستقل\موقع الاختبارات\brain-nafis\src\pages\games\SpeedChallenge.tsx'
# requiredCount is already 5
speed_repls = [
    (
        '<Button onClick={fetchQuestions} variant="outline" className="w-full h-12 font-bold rounded-xl border-2">',
        '''<Button asChild className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-500/20">
                                <Link to="/games/stages" className="flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 ml-2" />
                                    الانتقال للمرحلة التالية
                                </Link>
                            </Button>
                            <Button onClick={fetchQuestions} variant="outline" className="w-full h-12 font-bold rounded-xl border-2">'''
    )
]

patch_file(matching_path, matching_repls)
patch_file(ordering_path, ordering_repls)
patch_file(speed_path, speed_repls)
