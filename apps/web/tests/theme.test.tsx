import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ThemeToggle from "../src/lib/components/ThemeToggle.tsx";
import { ThemeProvider } from "../src/lib/theme.tsx";

it("restores themes, persists selection, reacts to system changes, and removes listeners", () => {
  localStorage.setItem("heyttpdump-theme", "dark");
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("matchMedia", () => media);
  const { unmount } = render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
  expect(document.documentElement.className).toBe("dark");
  fireEvent.click(screen.getByLabelText("Switch to Light theme"));
  expect(localStorage.getItem("heyttpdump-theme")).toBe("light");
  expect(document.documentElement.className).toBe("light");
  media.matches = true;
  act(() => {
    media.addEventListener.mock.calls[0][1]();
  });
  expect(document.documentElement.className).toBe("light");
  fireEvent.click(screen.getByLabelText("Switch to System theme"));
  expect(document.documentElement.className).toBe("dark");
  media.matches = false;
  act(() => {
    media.addEventListener.mock.calls[0][1]();
  });
  expect(document.documentElement.className).toBe("light");
  const listener = media.addEventListener.mock.calls[0][1];
  unmount();
  expect(media.removeEventListener).toHaveBeenCalledWith("change", listener);
});

it("ignores invalid saved values", () => {
  localStorage.setItem("heyttpdump-theme", "invalid");
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
  expect(document.documentElement.className).toBe("dark");
});

it("works when reading or writing storage throws", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
  expect(document.documentElement.className).toBe("light");
  fireEvent.click(screen.getByLabelText("Switch to Dark theme"));
  expect(document.documentElement.className).toBe("dark");
});
