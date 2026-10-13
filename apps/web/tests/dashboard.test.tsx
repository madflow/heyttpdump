import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "../src/lib/components/Dashboard.tsx";
import RequestDetails from "../src/lib/components/RequestDetails.tsx";
import { ThemeProvider } from "../src/lib/theme.tsx";
import type { Request } from "../src/lib/types.ts";

function captures(count = 10, prefix = "capture"): Request[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    createdAt: "2026-01-01T12:00:00Z",
    payload: {
      method: "POST",
      url: `https://example.test/${prefix}/${id}?q=yes`,
      headers: { "Content-Type": "application/json" },
      body: '{"ok":true}',
    },
  }));
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function mount() {
  await act(async () => {
    render(
      <ThemeProvider>
        <Dashboard />
      </ThemeProvider>,
    );
  });
}
async function click(label: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
}

describe("dashboard", () => {
  it("SSR renders a loading shell without browser globals or fetching", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const html = renderToString(
      <ThemeProvider>
        <Dashboard />
      </ThemeProvider>,
    );
    expect(html).toContain("HTTP Requests");
    expect(html).toContain("Loading...");
    expect(html).not.toContain("Switch to");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("polls each second, uses page offsets, cleans up, and expands only one request", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json(captures())));
    vi.stubGlobal("fetch", fetch);
    await mount();
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/requests?limit=10&offset=0",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Expand" })[0]);
    });
    expect(screen.getAllByText("Headers")).toHaveLength(1);
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Expand" })[0]);
    });
    expect(screen.getAllByText("Headers")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Collapse" })).toHaveLength(1);
    await click("Next");
    expect(fetch).toHaveBeenLastCalledWith("/api/requests?limit=10&offset=10", expect.anything());
    await click("Previous");
    expect(fetch).toHaveBeenLastCalledWith("/api/requests?limit=10&offset=0", expect.anything());
    const signal = fetch.mock.calls.at(-1)?.[1].signal as AbortSignal;
    // Explicit unmount via cleanup is also covered by the shared teardown.
    const { cleanup } = await import("@testing-library/react");
    cleanup();
    expect(signal.aborted).toBe(true);
    const calls = fetch.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(calls);
  });

  it("never overlaps polls and ignores a late response from the previous page", async () => {
    vi.useFakeTimers();
    const stale = deferred<Response>();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(captures()))
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue(Response.json(captures(1, "new-page")));
    vi.stubGlobal("fetch", fetch);
    await mount();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    const signal = fetch.mock.calls[1][1].signal as AbortSignal;
    await click("Next");
    expect(signal.aborted).toBe(true);
    expect(screen.getByText("/new-page/0?q=yes")).toBeTruthy();
    await act(async () => {
      stale.resolve(Response.json(captures(1, "stale")));
    });
    expect(screen.queryByText("/stale/0?q=yes")).toBeNull();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("retains displayed data on polling errors", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(captures(1)))
      .mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    await mount();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("/capture/0?q=yes")).toBeTruthy();
    expect(log).toHaveBeenCalledWith("Failed to fetch requests:", expect.any(Error));
  });

  it("confirms delete-all, disables destructive controls, refreshes, and ignores stale polls", async () => {
    vi.useFakeTimers();
    const stale = deferred<Response>();
    const deletion = deferred<Response>();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(captures(1)))
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(deletion.promise)
      .mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await mount();
    await click("Delete All");
    expect(fetch).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(true);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const staleSignal = fetch.mock.calls[1][1].signal as AbortSignal;
    await click("Delete All");
    expect(confirm).toHaveBeenCalledWith("Are you sure you want to delete all requests?");
    expect(staleSignal.aborted).toBe(true);
    expect(fetch).toHaveBeenLastCalledWith("/api/requests", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });
    expect((screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: "Delete All" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await act(async () => {
      deletion.resolve(Response.json({ deletedCount: 1 }));
    });
    await act(async () => {
      stale.resolve(Response.json(captures(1, "stale")));
    });
    expect(screen.getByText("No requests received yet")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("deletes individual requests and retains data/logs when deletion fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(captures(1)))
      .mockResolvedValueOnce(new Response("failure", { status: 500 }))
      .mockResolvedValueOnce(Response.json(captures(1)))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    await mount();
    await click("Delete");
    expect(log).toHaveBeenCalledWith("Failed to delete request:", expect.any(Error));
    expect(screen.getByText("/capture/0?q=yes")).toBeTruthy();
    await click("Delete");
    expect(fetch).toHaveBeenCalledWith("/api/requests/0", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });
    expect(screen.getByText("No requests received yet")).toBeTruthy();
  });
});

it("formats JSON case-insensitively, falls back to raw bodies, and hides missing bodies", () => {
  const { container, rerender } = render(
    <RequestDetails headers={{ "Content-Type": "application/json" }} body='{"ok":true}' />,
  );
  expect(container.querySelectorAll("pre")[1].textContent).toBe('{\n  "ok": true\n}');
  rerender(<RequestDetails headers={{ "content-type": "application/json" }} body="invalid json" />);
  expect(screen.getByText("invalid json")).toBeTruthy();
  rerender(<RequestDetails headers={{ "content-type": "text/plain" }} body='{"ok":true}' />);
  expect(container.querySelectorAll("pre")[1].textContent).toBe('{"ok":true}');
  rerender(<RequestDetails headers={{}} />);
  expect(screen.queryByText("Body")).toBeNull();
});
