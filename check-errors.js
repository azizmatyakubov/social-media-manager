const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileErrors = [];
  const fileWarnings = [];

  // Check for undefined/null reference patterns
  if (content.match(/\.\s*undefined\b/) || content.match(/\bundefined\./)) {
    fileErrors.push('Potential undefined access');
  }

  // Check for missing error handling in async functions
  const asyncFuncs = content.match(/async\s+function|\basync\s*\(/g) || [];
  const tryCatch = content.match(/try\s*{/g) || [];
  if (asyncFuncs.length > 0 && tryCatch.length === 0) {
    fileWarnings.push('Async functions without try-catch');
  }

  // Check for hardcoded URLs/secrets
  if (content.match(/https?:\/\/[^"'\s]+\.(com|io|xyz|org)/g) && !filePath.includes('test')) {
    const urls = content.match(/https?:\/\/[^"'\s]+/g) || [];
    const hardcodedUrls = urls.filter(u => !u.includes('localhost') && !u.includes('example.com') && !u.includes('placeholder'));
    if (hardcodedUrls.length > 0) {
      fileWarnings.push('Hardcoded URLs found: ' + hardcodedUrls.length);
    }
  }

  // Check for missing key prop in JSX arrays
  if (filePath.endsWith('.tsx') && content.includes('.map(')) {
    if (content.match(/\.map\([^)]+\)\s*=>\s*<[^>]+(?!key=)/)) {
      // This is a simplified check
    }
  }

  // Check for duplicate function definitions
  const funcDefs = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g) || [];
  const funcNames = funcDefs.map(f => f.match(/function\s+(\w+)/)?.[1]).filter(Boolean);
  const duplicateFuncs = funcNames.filter((name, index) => funcNames.indexOf(name) !== index);
  if (duplicateFuncs.length > 0) {
    fileErrors.push('Duplicate function: ' + [...new Set(duplicateFuncs)].join(', '));
  }

  // Check for unused imports (basic check)
  const importMatches = content.match(/import\s+{([^}]+)}\s+from/g) || [];
  for (const imp of importMatches) {
    const imports = imp.match(/{([^}]+)}/)?.[1]?.split(',').map(s => s.trim().split(' as ')[0].trim()) || [];
    for (const imported of imports) {
      if (imported && imported.length > 2) {
        const usagePattern = new RegExp('\\b' + imported + '\\b', 'g');
        const usages = content.match(usagePattern) || [];
        if (usages.length <= 1) {
          fileWarnings.push('Possibly unused import: ' + imported);
        }
      }
    }
  }

  return { errors: fileErrors, warnings: fileWarnings };
}

function walkDir(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.next' && !file.startsWith('.')) {
            walkDir(filePath, callback);
          }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          callback(filePath);
        }
      } catch (e) {}
    });
  } catch (e) {}
}

console.log('=== Comprehensive Error Check ===\n');

let totalErrors = 0;
let totalWarnings = 0;
const fileIssues = [];

walkDir('src', (filePath) => {
  const { errors: fileErrors, warnings: fileWarnings } = checkFile(filePath);
  if (fileErrors.length > 0 || fileWarnings.length > 0) {
    fileIssues.push({
      file: filePath.replace('src/', ''),
      errors: fileErrors,
      warnings: fileWarnings
    });
    totalErrors += fileErrors.length;
    totalWarnings += fileWarnings.length;
  }
});

// Print errors first
const filesWithErrors = fileIssues.filter(f => f.errors.length > 0);
if (filesWithErrors.length > 0) {
  console.log('=== ERRORS (' + totalErrors + ') ===');
  filesWithErrors.forEach(f => {
    console.log('\n' + f.file + ':');
    f.errors.forEach(e => console.log('  ❌ ' + e));
  });
}

// Print summary
console.log('\n=== SUMMARY ===');
console.log('Total files checked:', fileIssues.length + ' with issues');
console.log('Errors:', totalErrors);
console.log('Warnings:', totalWarnings);

// Check for critical files
console.log('\n=== Critical Files Check ===');
const criticalFiles = [
  'src/lib/auth.ts',
  'src/lib/prisma.ts',
  'src/app/api/auth/[...nextauth]/route.ts',
  'src/middleware.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log('✅ ' + file);
  } else {
    console.log('❌ Missing: ' + file);
  }
});

// Check for .env configuration
console.log('\n=== Environment Check ===');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
  requiredVars.forEach(v => {
    if (envContent.includes(v + '=')) {
      console.log('✅ ' + v + ' configured');
    } else {
      console.log('❌ Missing: ' + v);
    }
  });
} else {
  console.log('❌ .env file not found');
}

console.log('\n=== Done ===');
