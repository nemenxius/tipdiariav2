import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminCandidateTable } from "@/components/admin-candidate-table";
import { PickCard } from "@/components/pick-card";

describe("PickCard", () => {
  it("renders core betting metrics", () => {
    render(
      <PickCard
        pick={{
          id: 1,
          sport: "football",
          home_team: "Benfica",
          away_team: "Sporting",
          league: "Liga Portugal",
          start_time_utc: "2026-04-21T19:15:00.000Z",
          confidence: "strong",
          market_label: "home win",
          offered_odds: 2.1,
          estimated_probability: 0.56,
          fair_odds: 1.79,
          edge: 0.176,
          rationale: "Value exists."
        }}
      />
    );

    expect(screen.getByText(/Benfica vs Sporting/i)).toBeInTheDocument();
    expect(screen.getByText(/Est. Prob./i)).toBeInTheDocument();
    expect(screen.getByText(/17.6%/i)).toBeInTheDocument();
  });

  it("groups candidate picks by status and shows management actions", () => {
    render(
      <AdminCandidateTable
        picks={[
          {
            id: 1,
            home_team: "Benfica",
            away_team: "Sporting",
            league: "Liga Portugal",
            market_label: "home win",
            offered_odds: 2.1,
            edge: 0.061,
            confidence: "strong",
            status: "pending"
          },
          {
            id: 2,
            home_team: "Porto",
            away_team: "Braga",
            league: "Liga Portugal",
            market_label: "under 2 5",
            offered_odds: 1.95,
            edge: 0.074,
            confidence: "lean",
            status: "published"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: /Pending Review/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Published/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove From Feed/i })).toBeInTheDocument();
  });
});
