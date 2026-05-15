import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockMode: "en" | "ar" = "en";
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ mode: mockMode }),
}));

import NationalityCombobox from "@/components/NationalityCombobox";

describe("NationalityCombobox", () => {
  it("displays the selected country in English when EN-stored value is provided", () => {
    mockMode = "en";
    render(<NationalityCombobox value="Saudi Arabia" onChange={() => {}} />);
    expect(screen.getByText("Saudi Arabia")).toBeTruthy();
  });

  it("displays the selected country in Arabic when mode is AR (cross-language stored value)", () => {
    mockMode = "ar";
    render(<NationalityCombobox value="Saudi Arabia" onChange={() => {}} />);
    expect(screen.getByText("المملكة العربية السعودية")).toBeTruthy();
  });

  it("relocalizes when the stored value is the Arabic name and mode is EN", () => {
    mockMode = "en";
    render(<NationalityCombobox value="المملكة العربية السعودية" onChange={() => {}} />);
    expect(screen.getByText("Saudi Arabia")).toBeTruthy();
  });

  it("falls back to placeholder when value is empty", () => {
    mockMode = "en";
    render(<NationalityCombobox value="" onChange={() => {}} />);
    expect(screen.getByText(/Select nationality/i)).toBeTruthy();
  });

  it("emits the localized name on selection", () => {
    mockMode = "en";
    const onChange = vi.fn();
    render(<NationalityCombobox value="" onChange={onChange} />);
    // Open the listbox
    fireEvent.click(screen.getByRole("button"));
    // Click the Saudi Arabia option
    fireEvent.click(screen.getByRole("option", { name: /Saudi Arabia/ }));
    expect(onChange).toHaveBeenCalledWith("Saudi Arabia");
  });
});
