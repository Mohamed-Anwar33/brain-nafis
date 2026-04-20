const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', '..', '..', 'src', 'pages', 'games', 'WheelGame.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Fix 1: Add type cast for sectionsData on setSections line
content = content.replace(
  'setSections(sectionsData);',
  'setSections(sectionsData as unknown as WheelSection[]);'
);

// Fix 2: Add type for sectionIds map
content = content.replace(
  'const sectionIds = sectionsData.map((s) => s.id);',
  'const sectionIds = (sectionsData as any[]).map((s) => s.id);'
);

// Fix 3: Add type cast for questionsData on setQuestions line
content = content.replace(
  'setQuestions(allQuestions);',
  'setQuestions(allQuestions as unknown as WheelQuestion[]);'
);

// Fix 4: Add type cast for allQuestions
content = content.replace(
  'const allQuestions = questionsData || [];',
  'const allQuestions = (questionsData || []) as unknown as WheelQuestion[];'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Type fixes applied');
