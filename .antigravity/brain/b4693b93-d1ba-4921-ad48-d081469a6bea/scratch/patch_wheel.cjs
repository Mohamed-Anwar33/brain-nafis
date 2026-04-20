const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', '..', '..', 'src', 'pages', 'games', 'WheelGame.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the sections fetch - from applySelectionFilters to direct query
const oldSectionsBlock = `      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await applySelectionFilters(
        supabase
          .from("wheel_sections")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true }),
        selectionContext,
      );`;

const newSectionsBlock = `      // Fetch sections - no domain filter, show ALL for grade+subject
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("wheel_sections")
        .select("*")
        .eq("is_active", true)
        .eq("track_type", selectionContext.trackType)
        .eq("grade_subject_id", selectionContext.gradeSubjectId)
        .order("order_index", { ascending: true });`;

if (content.includes(oldSectionsBlock)) {
  content = content.replace(oldSectionsBlock, newSectionsBlock);
  console.log('✅ Replaced sections query');
} else {
  // Try with different line endings
  const oldNormalized = oldSectionsBlock.replace(/\r\n/g, '\n');
  const contentNormalized = content.replace(/\r\n/g, '\n');
  if (contentNormalized.includes(oldNormalized)) {
    content = content.replace(/\r\n/g, '\n');
    content = content.replace(oldNormalized, newSectionsBlock);
    console.log('✅ Replaced sections query (normalized line endings)');
  } else {
    console.log('❌ Could not find sections block');
    // Show what's around "// Fetch sections"
    const idx = content.indexOf('// Fetch sections');
    if (idx >= 0) {
      console.log('Found at index', idx);
      console.log('Context:', JSON.stringify(content.substring(idx, idx + 300)));
    }
  }
}

// Replace the questions fetch
const oldQuestionsBlock = `      // Fetch questions for all sections
      const { data: questionsData, error: questionsError } = await applySelectionFilters(
        supabase
          .from("wheel_section_questions")
          .select("*")
          .eq("is_active", true),
        selectionContext,
      );`;

const newQuestionsBlock = `      // Fetch questions for all active sections
      const sectionIds = sectionsData.map((s) => s.id);
      const { data: questionsData, error: questionsError } = await supabase
        .from("wheel_section_questions")
        .select("*")
        .eq("is_active", true)
        .eq("track_type", selectionContext.trackType)
        .eq("grade_subject_id", selectionContext.gradeSubjectId)
        .in("section_id", sectionIds);`;

if (content.includes(oldQuestionsBlock)) {
  content = content.replace(oldQuestionsBlock, newQuestionsBlock);
  console.log('✅ Replaced questions query');
} else {
  const oldNormalized = oldQuestionsBlock.replace(/\r\n/g, '\n');
  if (content.includes(oldNormalized)) {
    content = content.replace(oldNormalized, newQuestionsBlock);
    console.log('✅ Replaced questions query (normalized)');
  } else {
    console.log('❌ Could not find questions block');
    const idx = content.indexOf('// Fetch questions for all sections');
    if (idx >= 0) {
      console.log('Found at index', idx);
      console.log('Context:', JSON.stringify(content.substring(idx, idx + 300)));
    }
  }
}

// Also replace the error message
content = content.replace(
  'لا توجد أقسام مفعلة لهذا المجال حاليًا',
  'لا توجد أقسام مفعلة حاليًا'
);
content = content.replace(
  'لا توجد أسئلة مفعلة لهذا المجال حاليًا',
  'لا توجد أسئلة مفعلة حاليًا'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ File saved');
