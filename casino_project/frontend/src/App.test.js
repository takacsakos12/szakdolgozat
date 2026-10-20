import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { getCurrentUser } from "./api/authApi";

jest.mock("./api/authApi", () => ({
  getCurrentUser: jest.fn(),
  logoutUser: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("bejelentkezés nélkül is betöltődik a főoldal", async () => {
  getCurrentUser.mockResolvedValue({
    user: null,
  });

  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: /Kaszinójátékok\s+matematikai elemzése/i,
    }),
  ).toBeInTheDocument();

  expect(getCurrentUser).toHaveBeenCalled();
});
