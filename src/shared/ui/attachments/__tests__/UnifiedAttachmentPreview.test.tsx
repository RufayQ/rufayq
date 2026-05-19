/**
 * Parity test — UnifiedAttachmentPreview portals to document.body and closes
 * via X button + popstate. Same component is consumed by Journey
 * (RelatedDocumentsCard) and Records (TravelRecordsList), so this guarantees
 * identical behavior across sections.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UnifiedAttachmentPreview from "@/shared/ui/attachments/UnifiedAttachmentPreview";

describe("UnifiedAttachmentPreview", () => {
  it("portals to document.body at the canonical preview z-index layer", () => {
    const onClose = vi.fn();
    const { container } = render(
      <UnifiedAttachmentPreview
        open
        onClose={onClose}
        url="https://example.com/x.png"
        fileName="x.png"
        title="Test"
        mimeType="image/png"
      />,
    );
    // Component returns nothing inline — overlay lives directly under <body>.
    expect(container.firstChild).toBeNull();
    const overlay = document.body.querySelector('[data-overlay-layer="preview"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.parentElement).toBe(document.body);
  });

  it("closes on X button click", () => {
    const onClose = vi.fn();
    render(
      <UnifiedAttachmentPreview
        open
        onClose={onClose}
        url="https://example.com/x.png"
        fileName="x.png"
        title="Test"
        mimeType="image/png"
      />,
    );
    fireEvent.click(screen.getByLabelText("Close preview"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when hardware/browser back fires popstate", () => {
    const onClose = vi.fn();
    render(
      <UnifiedAttachmentPreview
        open
        onClose={onClose}
        url="https://example.com/x.png"
        fileName="x.png"
        title="Test"
        mimeType="image/png"
      />,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders extracted key fields when supplied", () => {
    render(
      <UnifiedAttachmentPreview
        open
        onClose={() => {}}
        url="https://example.com/x.png"
        fileName="x.png"
        title="Visa"
        mimeType="image/png"
        keyFields={[
          { label: "Visa number", value: "V12345" },
          { label: "Nationality", value: "Saudi Arabia" },
        ]}
      />,
    );
    expect(screen.getByText("V12345")).toBeInTheDocument();
    expect(screen.getByText("Saudi Arabia")).toBeInTheDocument();
  });

  it("does not mount overlay when closed", () => {
    render(
      <UnifiedAttachmentPreview
        open={false}
        onClose={() => {}}
        url="https://example.com/x.png"
        fileName="x.png"
        title="Test"
      />,
    );
    expect(document.body.querySelector('[data-overlay-layer="preview"]')).toBeNull();
  });
});
