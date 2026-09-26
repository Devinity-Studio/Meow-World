import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import WelcomePage from "@/app/page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock VillageScene to avoid SVG complexity in tests
vi.mock("@/components/welcome/VillageScene", () => ({
  default: ({ active, pressed }: { active?: boolean; pressed?: boolean }) => (
    <div data-testid="village-scene" data-active={active} data-pressed={pressed} />
  ),
}));

// Helper to get the first element from getAllBy queries (handles StrictMode double-render)
const first = <T extends HTMLElement>(elements: T[]): T => elements[elements.length - 1];

beforeEach(() => {
  vi.useFakeTimers();
  mockPush.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WelcomePage", () => {
  it("renders the main heading and welcome text", () => {
    render(<WelcomePage />);
    expect(screen.getByText("MEOW WORLD")).toBeInTheDocument();
    expect(screen.getByText("ยินดีต้อนรับ")).toBeInTheDocument();
    expect(screen.getByText("สู่โลกของเจ้าเหมียว")).toBeInTheDocument();
  });

  it("renders the VillageScene", () => {
    render(<WelcomePage />);
    expect(first(screen.getAllByTestId("village-scene"))).toBeInTheDocument();
  });

  it("shows hint text on first visit", async () => {
    render(<WelcomePage />);
    // Flush all pending state updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const hint = first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"));
    expect(hint).toHaveClass("opacity-90");
  });

  it("hides hint after HINT_MS (3s)", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const hint = first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"));
    expect(hint).toHaveClass("opacity-90");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    expect(first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"))).toHaveClass("opacity-0");
  });

  it("does not show hint for returning visitors", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const hint = first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"));
    expect(hint).toHaveClass("opacity-0");
  });

  it("shows idle nudge after IDLE_MS (8s) for returning visitors", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8500);
    });

    expect(first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"))).toHaveClass("opacity-90");
  });

  it("resets idle timer on pointer movement", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Move pointer at 5s — should reset idle timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    fireEvent.pointerMove(window);

    // Advance another 5s (total 10s, but 5s since last activity)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Should NOT show idle nudge yet (only 5s since last pointer move)
    expect(first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"))).toHaveClass("opacity-0");

    // Advance to full 8s since last move
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"))).toHaveClass("opacity-90");
  });

  it("navigates to /world when house button is clicked", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );

    fireEvent.click(houseButton);

    // Should set visited in localStorage
    expect(localStorage.getItem("meow_world_visited")).toBe("1");

    // Should navigate after 620ms delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    expect(mockPush).toHaveBeenCalledWith("/world");
  });

  it("does not navigate twice if house button clicked twice", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );

    fireEvent.click(houseButton);
    fireEvent.click(houseButton); // second click should be ignored

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("sets VillageScene active when house is hovered", async () => {
    localStorage.setItem("meow_world_visited", "1"); // skip hint
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );
    const scene = first(screen.getAllByTestId("village-scene"));

    // On returning visit, scene should start inactive
    expect(scene).toHaveAttribute("data-active", "false");

    fireEvent.pointerEnter(houseButton);
    expect(scene).toHaveAttribute("data-active", "true");

    fireEvent.pointerLeave(houseButton);
    expect(scene).toHaveAttribute("data-active", "false");
  });

  it("sets VillageScene pressed state on pointer down/up", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );
    const scene = first(screen.getAllByTestId("village-scene"));

    fireEvent.pointerDown(houseButton);
    expect(scene).toHaveAttribute("data-pressed", "true");

    fireEvent.pointerUp(houseButton);
    expect(scene).toHaveAttribute("data-pressed", "false");
  });

  it("renders nav actions (เพิ่มสมาชิก and สแกน QR)", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(first(screen.getAllByText("เพิ่มสมาชิก"))).toBeInTheDocument();
    expect(first(screen.getAllByText("สแกน QR"))).toBeInTheDocument();
  });

  it("navigates to /pets/birth when เพิ่มสมาชิก is clicked", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(first(screen.getAllByText("เพิ่มสมาชิก")));
    expect(mockPush).toHaveBeenCalledWith("/pets/birth");
  });

  it("navigates to /scan when สแกน QR is clicked", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(first(screen.getAllByText("สแกน QR")));
    expect(mockPush).toHaveBeenCalledWith("/scan");
  });

  it("sets VillageScene active on first-visit hint (hint=true)", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const scene = first(screen.getAllByTestId("village-scene"));
    expect(scene).toHaveAttribute("data-active", "true");
  });

  it("applies entering animation class when entering", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );

    fireEvent.click(houseButton);

    // The scene wrapper should have entering classes
    const sceneWrapper = houseButton.previousElementSibling;
    expect(sceneWrapper).toHaveClass("scale-[1.6]");
    expect(sceneWrapper).toHaveClass("opacity-0");
  });

  // --- Edge case tests ---

  it("sets --mw-play to paused when document is hidden", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Simulate tab hidden
    Object.defineProperty(document, "hidden", { value: true, writable: true });
    fireEvent(document, new Event("visibilitychange"));

    expect(document.documentElement.style.getPropertyValue("--mw-play")).toBe("paused");
  });

  it("sets --mw-play to running when document becomes visible", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // First hide
    Object.defineProperty(document, "hidden", { value: true, writable: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(document.documentElement.style.getPropertyValue("--mw-play")).toBe("paused");

    // Then show
    Object.defineProperty(document, "hidden", { value: false, writable: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(document.documentElement.style.getPropertyValue("--mw-play")).toBe("running");
  });

  it("house button is focusable and triggers hover state on focus", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );
    const scene = first(screen.getAllByTestId("village-scene"));

    expect(scene).toHaveAttribute("data-active", "false");

    // Focus should activate the scene
    fireEvent.focus(houseButton);
    expect(scene).toHaveAttribute("data-active", "true");

    // Blur should deactivate
    fireEvent.blur(houseButton);
    expect(scene).toHaveAttribute("data-active", "false");
  });

  it("pointer leave resets pressed state", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );
    const scene = first(screen.getAllByTestId("village-scene"));

    // Press down, then leave without releasing — pressed should reset
    fireEvent.pointerDown(houseButton);
    expect(scene).toHaveAttribute("data-pressed", "true");

    fireEvent.pointerLeave(houseButton);
    expect(scene).toHaveAttribute("data-pressed", "false");
  });

  it("house button has correct aria-label for accessibility", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );

    expect(houseButton).toHaveAttribute(
      "aria-label",
      "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว"
    );
  });

  it("nav has correct aria-label for accessibility", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const navs = screen.getAllByRole("navigation", { name: "ทางลัด" });
    expect(navs.length).toBeGreaterThan(0);
    expect(navs[navs.length - 1]).toBeInTheDocument();
  });

  it("does not navigate before 620ms delay completes", async () => {
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const houseButton = first(
      screen.getAllByRole("button", {
        name: "เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว",
      })
    );

    fireEvent.click(houseButton);

    // Before 620ms — should NOT have navigated yet
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("resets idle on keydown event", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Advance 6s (close to idle threshold)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    // Press a key to reset idle
    fireEvent.keyDown(window, { key: "Tab" });

    // Advance another 6s (only 6s since last activity)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    // Should NOT show idle nudge
    expect(first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"))).toHaveClass("opacity-0");
  });

  it("resets idle on scroll event", async () => {
    localStorage.setItem("meow_world_visited", "1");
    render(<WelcomePage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Advance 6s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    // Scroll to reset idle
    fireEvent.scroll(window);

    // Advance another 6s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(first(screen.getAllByText("แตะบ้านเพื่อเข้าไป"))).toHaveClass("opacity-0");
  });
});
