export interface TechSource {
  path: string;
  content: string;
}

const BY_FILE: Record<string, string[]> = {
  'package.json': ['JavaScript'],
  'tsconfig.json': ['TypeScript'],
  'requirements.txt': ['Python'],
  'pyproject.toml': ['Python'],
  Pipfile: ['Python'],
  'go.mod': ['Go'],
  'Cargo.toml': ['Rust'],
  'pom.xml': ['Java'],
  'build.gradle': ['Java'],
  'build.gradle.kts': ['Kotlin'],
  'composer.json': ['PHP'],
  Gemfile: ['Ruby'],
  'pubspec.yaml': ['Dart', 'Flutter'],
};

const BY_EXTENSION: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  mts: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  php: 'PHP',
  rb: 'Ruby',
  dart: 'Dart',
  cs: 'C#',
  c: 'C',
  cpp: 'C++',
  swift: 'Swift',
  vue: 'Vue',
  svelte: 'Svelte',
};

const BY_DEPENDENCY: Record<string, string> = {
  react: 'React',
  'react-native': 'React Native',
  next: 'Next.js',
  vue: 'Vue',
  nuxt: 'Nuxt',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  express: 'Express',
  '@nestjs/core': 'NestJS',
  typescript: 'TypeScript',
  prisma: 'Prisma',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  'laravel/framework': 'Laravel',
  'symfony/framework-bundle': 'Symfony',
  rails: 'Rails',
};

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function dependencyNames(file: TechSource): string[] {
  const name = baseName(file.path);
  try {
    if (name === 'package.json') {
      const pkg = JSON.parse(file.content);
      return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    }
    if (name === 'composer.json') return Object.keys(JSON.parse(file.content).require ?? {});
  } catch {
    return [];
  }
  if (name === 'requirements.txt' || name === 'pyproject.toml' || name === 'Pipfile' || name === 'Gemfile') {
    return (file.content.toLowerCase().match(/[a-z0-9_.-]+/g) ?? []).filter((w) => w in BY_DEPENDENCY);
  }
  return [];
}

/** Guesses the technologies of a project from its files (manifest files, dependencies, extensions). */
export function detectTech(files: TechSource[]): string[] {
  const tech = new Set<string>();
  for (const file of files) {
    const name = baseName(file.path);
    BY_FILE[name]?.forEach((t) => tech.add(t));
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
    if (BY_EXTENSION[ext]) tech.add(BY_EXTENSION[ext]);
    for (const dep of dependencyNames(file)) {
      if (BY_DEPENDENCY[dep]) tech.add(BY_DEPENDENCY[dep]);
    }
  }
  return [...tech];
}

/** Technologies close enough for a helper to step in when nobody answered (alert widening). */
const RELATED: Record<string, string[]> = {
  JavaScript: ['TypeScript', 'React', 'Vue', 'Svelte', 'Express', 'Next.js', 'Nuxt', 'Angular', 'NestJS', 'React Native'],
  TypeScript: ['JavaScript', 'Angular', 'NestJS', 'React', 'Next.js'],
  React: ['JavaScript', 'TypeScript', 'Next.js', 'React Native'],
  'Next.js': ['React', 'JavaScript', 'TypeScript'],
  'React Native': ['React', 'JavaScript'],
  Vue: ['JavaScript', 'Nuxt'],
  Nuxt: ['Vue', 'JavaScript'],
  Angular: ['TypeScript', 'JavaScript'],
  Svelte: ['JavaScript'],
  Express: ['JavaScript', 'NestJS'],
  NestJS: ['TypeScript', 'Express'],
  Prisma: ['TypeScript', 'JavaScript'],
  Python: ['Django', 'Flask', 'FastAPI'],
  Django: ['Python'],
  Flask: ['Python'],
  FastAPI: ['Python'],
  PHP: ['Laravel', 'Symfony'],
  Laravel: ['PHP'],
  Symfony: ['PHP'],
  Ruby: ['Rails'],
  Rails: ['Ruby'],
  Java: ['Kotlin'],
  Kotlin: ['Java'],
  Dart: ['Flutter'],
  Flutter: ['Dart'],
  C: ['C++'],
  'C++': ['C'],
};

export const KNOWN_TECH: string[] = [
  ...new Set([...Object.values(BY_FILE).flat(), ...Object.values(BY_EXTENSION), ...Object.values(BY_DEPENDENCY)]),
].sort((a, b) => a.localeCompare(b));

/** The given technologies plus their close ones. */
export function relatedTech(tech: string[]): string[] {
  const result = new Set(tech);
  for (const t of tech) RELATED[t]?.forEach((r) => result.add(r));
  return [...result];
}
