import { expect, test } from "@playwright/test";

test("manual record happy path persists an event and shows it in the timeline", async ({ page }) => {
  await page.goto("/events/new");

  await expect(page.getByRole("heading", { name: "記録を追加" })).toBeVisible();
  await expect(page.locator("#occurredAtLocal")).not.toHaveValue("");

  await page.getByLabel("種類").selectOption("symptom");
  await page.getByLabel("内容").fill("E2E腹痛");
  await page.getByLabel("分類名（任意）").selectOption("abdominal_pain");
  await page.getByLabel("症状の強さ（0〜10）").fill("6");

  await page.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page).toHaveURL(/\/timeline\?created=1$/);
  await expect(page.getByRole("heading", { name: "履歴" })).toBeVisible();
  await expect(page.getByText("E2E腹痛", { exact: true })).toBeVisible();
});
