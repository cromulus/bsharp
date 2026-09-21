import { openMenu, choosePracticeSetting } from '../ui/helpers';
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    // Seed session history so onboarding guess/success/retry overlays are skipped
    localStorage.setItem(
      "bsharp_session_history",
      JSON.stringify({ "100": { chord: [{ identifications: 1 }] } }),
    );
    (window as any).__bsharp_test_deterministic_color = "red";
  });
  await page.goto("/");
});

test("baseline flag outlines", async ({ page }) => {
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "flags-baseline.png",
  );
});

test("correct selection outline", async ({ page }) => {
  await page.locator("#play-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-stage", "choose");

  // Red is the forced color, so clicking red is correct
  await page.locator("#red-flag .flag").click();

  await expect(page.locator("#red-flag .flag")).toHaveClass(/flag-correct/);
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "flags-correct.png",
  );
});

test("incorrect selection outline", async ({ page }) => {
  await page.locator("#play-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-stage", "choose");

  // Red is the forced color, so clicking yellow is wrong
  await page.locator("#yellow-flag .flag").click();

  await expect(page.locator("#yellow-flag .flag")).toHaveClass(/flag-incorrect/);
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "flags-incorrect.png",
  );
});

// Helper to seed localStorage state at a given level (chord)
function seedStateAtLevel(chord: string): string {
  const state = {
    profiles: {
      "100": {
        id: 100,
        name: "Guest",
        icon: "fa-user",
        current_chord: chord,
        current_instrument: "piano",
        stats: {
          current_chord: chord,
          start_time: 0,
          updated_time: 0,
          correct: 0,
          incorrect: 0,
          identifications: 0,
          confusion_matrix: {},
        },
        target_number: 10,
        show_chord_mode: "always",
        reveal_chord_mode: "name_and_color",
        chord_display_mode: "shapes_and_letters",
        single_note_mode: false,
        single_note_correctness_mode: "wrong_and_right",
        persist_reaction_face: false,
        enable_onboarding_hints: false,
        color_scheme: "dark",
      },
    },
    current_chord: chord,
    current_profile: 100,
  };
  return JSON.stringify(state);
}

test("parent navigation has labeled, separate touch targets", async ({ page }) => {
  await openMenu(page);
  const targets = await page.locator('.expansion-container .infobox-trigger').evaluateAll(elements => elements.map(el => {
    const { left, right, height } = el.getBoundingClientRect();
    return { left, right, height, label: el.textContent?.trim() };
  }));
  for (let i = 0; i < targets.length; i++) {
    expect(targets[i].height).toBeGreaterThanOrEqual(44);
    expect(targets[i].label).toBeTruthy();
    if (i > 0) expect(targets[i].left).toBeGreaterThanOrEqual(targets[i - 1].right);
  }
});

test("tablet layout at high level - no menu overlap", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await page.addInitScript((stateJson: string) => {
    localStorage.clear();
    localStorage.setItem("bsharp_state", stateJson);
    localStorage.setItem(
      "bsharp_session_history",
      JSON.stringify({ "100": { skyblue: [{ identifications: 1 }] } }),
    );
    (window as any).__bsharp_test_deterministic_color = "red";
  }, seedStateAtLevel("skyblue"));
  await page.goto("/");

  await expect(page).toHaveScreenshot("tablet-high-level.png");
});

test("mobile layout at high level", async ({ page }) => {
  await page.addInitScript((stateJson: string) => {
    localStorage.clear();
    localStorage.setItem("bsharp_state", stateJson);
    localStorage.setItem(
      "bsharp_session_history",
      JSON.stringify({ "100": { skyblue: [{ identifications: 1 }] } }),
    );
    (window as any).__bsharp_test_deterministic_color = "red";
  }, seedStateAtLevel("skyblue"));
  await page.goto("/");

  await expect(page).toHaveScreenshot("mobile-high-level.png");
});

test("tablet layout at low level", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await page.addInitScript((stateJson: string) => {
    localStorage.clear();
    localStorage.setItem("bsharp_state", stateJson);
    localStorage.setItem(
      "bsharp_session_history",
      JSON.stringify({ "100": { blue: [{ identifications: 1 }] } }),
    );
    (window as any).__bsharp_test_deterministic_color = "red";
  }, seedStateAtLevel("blue"));
  await page.goto("/");

  await expect(page).toHaveScreenshot("tablet-low-level.png");
});

test("stats bar after correct guess", async ({ page }) => {
  await page.locator("#play-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-stage", "choose");

  await page.locator("#red-flag .flag").click();
  await expect(page.locator("#red-flag .flag")).toHaveClass(/flag-correct/);

  await openMenu(page);
  await expect(page.locator("#stats-container")).toHaveScreenshot(
    "stats-correct.png",
  );
});

test("stats bar after incorrect guess", async ({ page }) => {
  await page.locator("#play-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-stage", "choose");

  await page.locator("#yellow-flag .flag").click();
  await expect(page.locator("#yellow-flag .flag")).toHaveClass(/flag-incorrect/);

  await openMenu(page);
  await expect(page.locator("#stats-container")).toHaveScreenshot(
    "stats-incorrect.png",
  );
});

test('all fourteen colors retain usable touch targets', async ({ page }) => {
  await choosePracticeSetting(page, 'chord-selector', 'skyblue');
  const sizes = await page.locator('#flag-holder .flag-wrapper.visible').evaluateAll(pads => pads.map(pad => {
    const { width, height } = pad.getBoundingClientRect();
    return { width, height };
  }));
  expect(sizes).toHaveLength(14);
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator('#flag-holder')).toHaveScreenshot('flags-all-colors.png');
});
