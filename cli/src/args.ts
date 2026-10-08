export class CliError extends Error {}

export const SUBCOMMANDS = ['login', 'logout', 'whoami', 'send'] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];

export interface CliArgs {
  subcommand?: Subcommand;
  /** `sos login --dev <pseudo>` */
  dev?: string;
  /** `sos login --server <url>` */
  server?: string;
  command: string[];
  add: string[];
  yes: boolean;
  dryRun: boolean;
  json: boolean;
  force: boolean;
  /** Send without waiting for a helper in the terminal. */
  noWait: boolean;
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
    noWait: false,
    help: false,
    version: false,
  };
  if ((SUBCOMMANDS as readonly string[]).includes(argv[0] ?? '')) return parseSubcommand(argv, args);
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
      case '--no-wait':
        args.noWait = true;
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

/** `sos login|logout|whoami|send ...`. To run a program named like a subcommand: `sos -- login`. */
function parseSubcommand(argv: string[], args: CliArgs): CliArgs {
  args.subcommand = argv[0] as Subcommand;
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i]!;
    const value = () => {
      const next = argv[++i];
      if (!next || next.startsWith('-')) throw new CliError(`${token} attend une valeur`);
      return next;
    };
    if (token === '-h' || token === '--help') args.help = true;
    else if (token === '--dev' && args.subcommand === 'login') args.dev = value();
    else if (token === '--server' && args.subcommand === 'login') args.server = value();
    else if (token.startsWith('-')) throw new CliError(`Option inconnue pour « sos ${args.subcommand} » : ${token}`);
    else args.command.push(token);
  }
  return args;
}

export const USAGE = `Utilisation : sos [options] <commande...>

Lance ta commande. Si elle plante, sos récupère l'erreur et les fichiers concernés,
masque tes secrets sur ta machine et te montre exactement ce qui partira.

Exemples :
  sos npm start
  sos python main.py
  sos --add src/config.ts npm test

Compte :
  sos login                 Se connecter avec GitHub (code à saisir sur github.com)
  sos login --dev <pseudo>  Mode démo, sans GitHub (serveur local uniquement)
  sos login --server <url>  Choisir le serveur SOS Dev (défaut : http://localhost:4000)
  sos whoami                Afficher le compte connecté
  sos logout                Se déconnecter
  sos send <fichier>        Envoyer une demande gardée sur ta machine

Options :
  -a, --add <fichier>  Ajouter un fichier à la demande (répétable)
  -y, --yes            Valider sans poser de question
      --dry-run        Afficher l'aperçu sans rien envoyer
      --json           Afficher la demande au format JSON (rien n'est envoyé)
      --force          Préparer une demande même si la commande réussit
      --no-wait        Envoyer sans attendre un aidant dans le terminal
  -v, --version        Afficher la version
  -h, --help           Afficher cette aide`;
