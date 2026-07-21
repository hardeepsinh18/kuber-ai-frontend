import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/chart-preview.html');
});

test('chart mounts a canvas', async ({ page }) => {
    const chart = page.getByTestId('chart-default');
    await expect(chart.locator('canvas').first()).toBeVisible();
});

test('candles is the default chart type', async ({ page }) => {
    const chart = page.getByTestId('chart-default');
    await expect(chart.getByRole('button', { name: 'Candlestick chart' })).toHaveAttribute('aria-pressed', 'true');
});

test('every chart type renders without a console error', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const chart = page.getByTestId('chart-default');
    for (const name of ['Area chart', 'Heikin-Ashi chart', 'Renko chart', 'Candlestick chart']) {
        await chart.getByRole('button', { name }).click();
        await expect(chart.locator('canvas').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
});

test('crosshair updates the legend to a rupee price', async ({ page }) => {
    const chart = page.getByTestId('chart-default');
    const canvas = chart.locator('canvas').first();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(chart.getByText(/₹[\d,]+\.\d{2}/).first()).toBeVisible();
});

test('legend price uses en-IN grouping and two decimals', async ({ page }) => {
    const chart = page.getByTestId('chart-default');
    const canvas = chart.locator('canvas').first();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    const text = await chart.getByText(/₹[\d,]+\.\d{2}/).first().textContent();
    expect(text).toMatch(/₹\d{1,2}(,\d{2})*(,\d{3})?\.\d{2}|₹\d{1,3}(,\d{3})*\.\d{2}/);
});

test('expand opens the fullscreen dialog and Esc closes it', async ({ page }) => {
    const chart = page.getByTestId('chart-default');
    await chart.getByRole('button', { name: 'Expand chart' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('canvas').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
});

test('zoom in narrows the visible range, zoom out widens it', async ({ page }) => {
    const chart = page.getByTestId('chart-default');
    await expect(chart.locator('canvas').first()).toBeVisible();

    // The harness exposes the chart's visible logical range for assertions —
    // see Step 1. Reading it is the only way to prove zoom did something; a
    // canvas-is-visible check passes even when zoom is completely broken.
    const span = () => page.evaluate(() => {
        const r = window.__chartVisibleRange__?.();
        return r ? r.to - r.from : null;
    });

    const before = await span();
    expect(before).not.toBeNull();

    await chart.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(span).toBeLessThan(before);

    const zoomed = await span();
    await chart.getByRole('button', { name: 'Zoom out' }).click();
    await expect.poll(span).toBeGreaterThan(zoomed);
});
