import fs from 'fs';
import path from 'path';

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles('./src');
console.log(`Auditing ${files.length} files in src/...`);

const colorClassPattern = /\b(bg|text|border|ring)-(blue|indigo|slate|gray|green|emerald|amber|yellow|teal|violet|purple|rose|red)-[0-9]{2,3}\b/g;

const matchesByFile = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(colorClassPattern);
  if (matches) {
    matchesByFile[file] = Array.from(new Set(matches));
  }
});

console.log('Files using default Tailwind color classes (e.g. bg-blue-600 instead of custom brand hex or variables):');
console.log(JSON.stringify(matchesByFile, null, 2));
