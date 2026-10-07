import { test, expect } from '@playwright/test';

test.describe('Parcours de démo complet KoraDevs + CodeFlash', () => {
  test('Exécute le parcours de bout en bout sans aucune erreur console', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors & warnings
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Navigation vers la page d'accueil / Découvrir
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Bloqué sur ton code');

    // 2. Aller sur /ask (Demander de l'aide)
    await page.goto('/ask');
    await expect(page.locator('h3')).toContainText('Formulaire d’appel à l’aide');

    // Saisir une demande
    await page.fill('input[placeholder*="Erreur CORS"]', 'Crash CORS API Express avec React');
    await page.fill('textarea[placeholder*="Raconte ce que tu essayais"]', 'Le serveur rejette les requêtes POST depuis le port 5173.');
    await page.fill('textarea[placeholder*="Colle ton extrait"]', 'const key = "SECRET_API_KEY_TEST_99";');

    // Aperçu secret masqué
    await page.click('button:has-text("Voir l’aperçu")');
    await expect(page.locator('text=secret(s) masqué(s)')).toBeVisible();

    // Publier sur le Radar
    await page.click('button:has-text("Confirmer et envoyer")');
    await page.waitForURL('**/radar');

    // 3. Sur le Radar
    await expect(page.locator('h3')).toContainText('Radar des aidants');
    await expect(page.locator('text=Crash CORS API Express')).toBeVisible();

    // 4. Rejoindre la salle CodeFlash
    await page.click('button:has-text("Rejoindre en CodeFlash")');
    await expect(page.locator('h3')).toContainText('Crash CORS API Express');

    // 5. Exécuter le test
    await page.click('button:has-text("Lancer le test")');
    await expect(page.locator('text=TEST RÉUSSI')).toBeVisible();

    // 6. Donner son accord et publier
    await page.click('button:has-text("Donner mon accord pour publier la fiche")');

    // 7. Aller sur /passport
    await page.goto('/passport');
    await expect(page.locator('h2')).toContainText('Koffi Mensah');
    await expect(page.locator('text=PASSEPORT DE COMPÉTENCES')).toBeVisible();

    // 8. Aller sur /guide et /demo
    await page.goto('/guide');
    await expect(page.locator('h2')).toContainText('Guide interactif');

    await page.goto('/demo');
    await expect(page.locator('h2')).toContainText('Parcours Démo 2 Minutes');

    // Vérifier zéro erreur console
    expect(consoleErrors).toEqual([]);
  });
});
