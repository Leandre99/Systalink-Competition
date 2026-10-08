export class CliError extends Error {}

export interface CliArgs {
  command: string[];
  add: string[];
  yes: boolean;
  dryRun: boolean;
  json: boolean;
  force: boolean;
  help: boolean;
  version: boolean;
}

/** Parses `sos [options] <commande...>`: options are read until the first non-option token or `--`. */
export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: [],
    add: [],
    yes: false,
    dryRun: false,
    json: false,
    force: false,
    help: false,
    version: false,
  };
  let i = 0;
  for (; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === '--') {
      i++;
      break;
    }
    if (!token.startsWith('-') || token === '-') break;
    if (token.startsWith('--add=')) {
      args.add.push(token.slice('--add='.length));
      continue;
    }
    switch (token) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-v':
      case '--version':
        args.version = true;
        break;
      case '-y':
      case '--yes':
        args.yes = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--json':
        args.json = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '-a':
      case '--add': {
        const value = argv[++i];
        if (!value) throw new CliError(`${token} attend un chemin de fichier`);
        args.add.push(value);
        break;
      }
      default:
        throw new CliError(`Option inconnue : ${token}`);
    }
  }
  args.command = argv.slice(i);
  return args;
}

export const USAGE = `Utilisation : sos [options] <commande...>

Lance ta commande. Si elle plante, sos récupère l'erreur et les fichiers concernés,
masque tes secrets sur ta machine et te montre exactement ce qui partira.

Exemples :
  sos npm start
  sos python main.py
  sos --add src/config.ts npm test

Options :
  -a, --add <fichier>  Ajouter un fichier à la demande (répétable)
  -y, --yes            Valider sans poser de question
      --dry-run        Afficher l'aperçu sans rien envoyer
      --json           Afficher la demande au format JSON (rien n'est envoyé)
      --force          Préparer une demande même si la commande réussit
  -v, --version        Afficher la version
  -h, --help           Afficher cette aide`;
