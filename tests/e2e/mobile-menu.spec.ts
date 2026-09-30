import { test, expect } from '@playwright/test';

// Scénario 3 (équivalent « création d'un objet ») : l'interaction principale de la page, le menu mobile
test.describe('Menu mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("le menu s'ouvre puis se referme après le choix d'un lien", async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByTestId('menu-toggle');
    const nav = page.getByTestId('main-nav');

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
  });
});

test.describe('Menu sur ordinateur', () => {
  test('le menu est affiché directement, sans bouton', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('main-nav')).toBeVisible();
    await expect(page.getByTestId('menu-toggle')).toBeHidden();
  });
});
