import fs from 'node:fs';
import pc from 'picocolors';
import { SosRequestSchema, type SosRequest } from '@sos/shared';
import { ApiError, createApi } from './api.js';
import { CliError } from './args.js';
import { readConfig, serverUrl, writeConfig } from './config.js';
import { githubDeviceFlow } from './device-flow.js';
import { saveRequest } from './store.js';

export async function login(options: { dev?: string; server?: string }): Promise<number> {
  const config = readConfig();
  const server = options.server ? options.server.replace(/\/+$/, '') : serverUrl(config);
  const api = createApi(server);

  let session;
  if (options.dev) {
    session = await api.loginDev(options.dev);
  } else {
    const auth = await api.authConfig();
    if (!auth.githubClientId) {
      throw new CliError(
        auth.devAuth
          ? 'ce serveur n’a pas de connexion GitHub configurée. Pour tester en local : sos login --dev <pseudo>'
          : 'ce serveur n’a pas de connexion GitHub configurée.',
      );
    }
    const githubToken = await githubDeviceFlow(auth.githubClientId, {
      onCode: ({ userCode, verificationUri }) => {
        console.log(`\nOuvre ${pc.bold(verificationUri)} et saisis le code ${pc.bold(pc.cyan(userCode))}`);
        console.log(pc.dim('En attente de ta validation sur GitHub…'));
      },
    });
    session = await api.loginGithub(githubToken);
  }

  writeConfig({ ...config, ...(options.server ? { server } : {}), token: session.token, login: session.user.login });
  const mode = session.user.provider === 'dev' ? ' (mode démo)' : '';
  console.log(pc.green(`✔ Connecté en tant que ${session.user.login}${mode} sur ${server}.`));
  return 0;
}

export async function logout(): Promise<number> {
  const config = readConfig();
  if (config.token) await createApi(serverUrl(config), config.token).logout().catch(() => undefined);
  const { token: _token, login: _login, ...rest } = config;
  writeConfig(rest);
  console.log('Déconnecté.');
  return 0;
}

export async function whoami(): Promise<number> {
  const config = readConfig();
  if (!config.token) {
    console.log('Pas connecté. Lance « sos login ».');
    return 1;
  }
  const user = await createApi(serverUrl(config), config.token).me();
  console.log(`${user.login}${user.provider === 'dev' ? ' (mode démo)' : ''} sur ${serverUrl(config)}`);
  return 0;
}

/** Sends a validated request; keeps it on disk if the server cannot take it. */
export async function deliver(request: SosRequest): Promise<boolean> {
  const config = readConfig();
  if (!config.token) {
    const file = saveRequest(request);
    console.log(pc.yellow('\nTu n’es pas connecté : lance « sos login », puis « sos send » pour l’envoyer.'));
    console.log(pc.dim(`  La demande est gardée sur ta machine : ${file}`));
    return false;
  }
  try {
    const sent = await createApi(serverUrl(config), config.token).sendRequest(request);
    console.log(pc.green(`\n✔ Demande envoyée (${sent.id.slice(0, 8)}).`));
    if (sent.secondPassMasked > 0) console.log(pc.yellow(`  Le serveur a masqué ${sent.secondPassMasked} secret(s) de plus.`));
    console.log(pc.dim(`  Ton code sera effacé du serveur au plus tard le ${new Date(sent.expiresAt).toLocaleString('fr-FR')}.`));
    console.log(pc.dim('  Les aidants seront alertés dès l’étape 3 (Radar).'));
    return true;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const file = saveRequest(request);
    console.log(pc.yellow(`\nEnvoi impossible : ${error.message}`));
    console.log(pc.dim(`  La demande est gardée sur ta machine : ${file}\n  Renvoie-la plus tard avec « sos send ${file} ».`));
    return false;
  }
}

export async function send(file: string | undefined): Promise<number> {
  if (!file) throw new CliError('indique le fichier de la demande : sos send ~/.sos/demandes/<fichier>.json');
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new CliError(`impossible de lire ${file}`);
  }
  const parsed = SosRequestSchema.safeParse(data);
  if (!parsed.success) throw new CliError(`${file} n’est pas une demande SOS valide`);
  const config = readConfig();
  if (!config.token) throw new CliError('tu n’es pas connecté : lance « sos login »');
  const sent = await createApi(serverUrl(config), config.token).sendRequest(parsed.data);
  fs.rmSync(file);
  console.log(pc.green(`✔ Demande envoyée (${sent.id.slice(0, 8)}). Le fichier local a été supprimé.`));
  return 0;
}
