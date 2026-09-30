import { test, expect } from '@playwright/test';

// Scénario 1 (équivalent « connexion ») : le parcours de lecture d'un membre du jury
const SECTIONS = ['presentation', 'parcours', 'competences', 'realisations', 'synthese', 'veille', 'contact'];

test.describe('Parcours de lecture', () => {
  test("la page d'accueil affiche toutes les sections de l'épreuve E5", async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Portfolio BTS SIO/);
    for (const id of SECTIONS) {
      await expect(page.getByTestId(`section-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId('synthese-table')).toBeVisible();
  });

  test('un clic dans le menu amène à la section et la surligne', async ({ page }) => {
    await page.goto('/');
    const link = page.getByTestId('main-nav').getByRole('link', { name: 'Réalisations' });

    await link.click();

    await expect(page).toHaveURL(/#realisations$/);
    await expect(page.getByTestId('section-realisations')).toBeInViewport();
    await expect(link).toHaveAttribute('aria-current', 'true');
    await expect(link).toHaveClass(/active/);
  });
});
