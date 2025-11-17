import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { AppHeader } from "./app-header";

describe("AppHeader", () => {
  it("renders branding and navigation", () => {
    const html = renderToString(<AppHeader />);

    expect(html).toContain("Playlist");
    expect(html).toContain("Home");
  });
});
