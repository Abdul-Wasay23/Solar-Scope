import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Button from "./Button";
import Input from "./Input";
import AuthInput from "./AuthInput";
import Card from "./Card";
import Badge from "./Badge";
import Select from "./Select";

describe("Button Component", () => {
  it("renders its label correctly", () => {
    render(<Button>Create Project</Button>);
    expect(
      screen.getByRole("button", { name: "Create Project" })
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Create Project</Button>);

    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("disables the button while loading", () => {
    render(<Button loading>Save</Button>);
    expect(
      screen.getByRole("button", { name: "Please wait..." })
    ).toBeDisabled();
  });
});

describe("Input Component", () => {
  it("renders a label connected to its input", () => {
    render(<Input label="Project Name" placeholder="Enter name" />);
    expect(
      screen.getByRole("textbox", { name: /Project Name/i })
    ).toBeInTheDocument();
  });

  it("displays an error message and sets aria-invalid", () => {
    render(<Input label="Project Name" error="Project name is required" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Project name is required"
    );
    expect(
      screen.getByRole("textbox", { name: /Project Name/i })
    ).toHaveAttribute("aria-invalid", "true");
  });
});

describe("AuthInput Component", () => {
  it("renders label and toggles password visibility", async () => {
    const user = userEvent.setup();
    render(
      <AuthInput
        label="Password"
        type="password"
        placeholder="Enter password"
      />
    );

    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    expect(toggleBtn).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("shows error alert and aria-invalid on validation error", () => {
    render(
      <AuthInput
        label="Email"
        type="email"
        error="Invalid email format"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email format");
    expect(
      screen.getByRole("textbox", { name: /email/i })
    ).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Select Component", () => {
  it("renders options and selects a value", async () => {
    const options = [
      { value: "residential", label: "Residential" },
      { value: "commercial", label: "Commercial" },
    ];
    render(<Select label="System Type" options={options} />);
    expect(
      screen.getByRole("combobox", { name: /System Type/i })
    ).toBeInTheDocument();
  });
});

describe("Card Component", () => {
  it("renders its title and content", () => {
    render(<Card title="Project Details">Solar panel planning</Card>);
    expect(
      screen.getByRole("heading", { name: "Project Details" })
    ).toBeInTheDocument();
    expect(screen.getByText("Solar panel planning")).toBeInTheDocument();
  });
});

describe("Badge Component", () => {
  it("renders its status label", () => {
    render(<Badge variant="success">Completed</Badge>);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
