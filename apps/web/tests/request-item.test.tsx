import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import RequestItem from "../src/lib/components/RequestItem.tsx";
import type { Request } from "../src/lib/types.ts";

it("keeps long URLs intact in the collapsed tooltip and expanded scroll region", () => {
  const query = `?search=${"unbroken-query-value".repeat(400)}&tag=one&tag=two`;
  const request: Request = {
    id: 1,
    createdAt: "2026-01-01T12:00:00Z",
    payload: {
      method: "POST",
      url: `https://example.test/path${query}`,
      headers: { "content-type": "text/plain" },
      body: "unbroken-body".repeat(500),
    },
  };
  const onToggleExpand = vi.fn();
  const onDelete = vi.fn();
  const props = { request, loading: false, onToggleExpand, onDelete };
  const { rerender } = render(<RequestItem {...props} isExpanded={false} />);
  expect(screen.getByTitle(`/path${query}`).textContent).toBe(`/path${query}`);
  expect(screen.queryByRole("region", { name: "Request URL" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Expand" }));
  expect(onToggleExpand).toHaveBeenCalledOnce();

  rerender(<RequestItem {...props} isExpanded />);
  const url = screen.getByRole("region", { name: "Request URL" });
  expect(url.textContent).toBe(request.payload.url);
  expect(url.tabIndex).toBe(0);
  expect(screen.getByText(request.payload.body!)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Collapse" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledOnce();
});

it("renders captured URL markup as text rather than executable HTML", () => {
  const url = 'https://example.test/?html=<img src=x onerror="alert(1)">';
  const request: Request = {
    id: 1,
    createdAt: "2026-01-01T12:00:00Z",
    payload: { method: "GET", url, headers: {} },
  };
  const { container } = render(
    <RequestItem
      request={request}
      isExpanded
      loading={false}
      onToggleExpand={() => {}}
      onDelete={() => {}}
    />,
  );
  expect(screen.getByRole("region", { name: "Request URL" }).textContent).toBe(url);
  expect(container.querySelector("img")).toBeNull();
});
