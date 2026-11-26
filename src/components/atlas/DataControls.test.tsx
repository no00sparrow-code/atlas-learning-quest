import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataControls } from "./DataControls";

const { useAtlasMock } = vi.hoisted(() => ({
  useAtlasMock: vi.fn(),
}));

vi.mock("@/lib/atlas-store", () => ({
  useAtlas: useAtlasMock,
}));

describe("Atlas data controls", () => {
  beforeEach(() => {
    useAtlasMock.mockReset();
  });

  it("offers a recovery download when an unreadable local backup was preserved", () => {
    const clearRecoveryBackup = vi.fn();
    useAtlasMock.mockReturnValue({
      state: { name: "Learner", handle: "" },
      importProgress: vi.fn(),
      updateProfile: vi.fn(),
      recoveryBackup: '{"version":99}',
      clearRecoveryBackup,
    });

    render(<DataControls />);

    expect(screen.getByRole("alert")).toHaveTextContent("previous progress file needs recovery");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss recovery copy" }));
    expect(clearRecoveryBackup).toHaveBeenCalledOnce();
  });

  it("does not show recovery controls when no recovery copy exists", () => {
    useAtlasMock.mockReturnValue({
      state: { name: "Learner", handle: "" },
      importProgress: vi.fn(),
      updateProfile: vi.fn(),
      recoveryBackup: null,
      clearRecoveryBackup: vi.fn(),
    });

    render(<DataControls />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
