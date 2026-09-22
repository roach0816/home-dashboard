"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import type { WidgetCardSize, SportsTeamConfig } from "@/lib/types";
import { SPORTS_LEAGUES, LEAGUE_META, type SportsLeague } from "@/lib/sportsLeagues";

type TeamOption = { id: string; name: string; logo?: string };

export default function SportsConfigModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<SportsTeamConfig>;
  onSave: (config: SportsTeamConfig) => void;
  onClose: () => void;
}) {
  const [league, setLeague] = useState<SportsLeague | undefined>(initial?.league);
  const [teamId, setTeamId] = useState<string | undefined>(initial?.teamId);
  const [teams, setTeams] = useState<TeamOption[] | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [label, setLabel] = useState(initial?.label ?? "");
  const [refreshSeconds, setRefreshSeconds] = useState(initial?.refreshSeconds ?? 60);
  const [cardSize, setCardSize] = useState<WidgetCardSize>(initial?.cardSize ?? "full");
  const [saving, setSaving] = useState(false);

  async function loadTeams(forLeague: SportsLeague) {
    setTeams(null);
    setTeamsError(null);
    setLoadingTeams(true);
    try {
      const res = await fetch(`/api/integrations/sports/teams?league=${forLeague}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load teams");
      setTeams(body.teams);
    } catch (err) {
      setTeamsError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoadingTeams(false);
    }
  }

  function pickLeague(next: SportsLeague) {
    if (next === league) return;
    setLeague(next);
    setTeamId(undefined);
    void loadTeams(next);
  }

  // Editing an existing widget: re-load its already-chosen league's teams so
  // the select has options to show the saved team against. Deferred through
  // a microtask so the state updates inside loadTeams() happen in a
  // callback rather than synchronously in the effect body.
  useEffect(() => {
    if (initial?.league) void Promise.resolve().then(() => loadTeams(initial.league!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (!league || !teamId) return;
    setSaving(true);
    onSave({
      league,
      teamId,
      label: label.trim() || undefined,
      refreshSeconds,
      cardSize,
    });
  }

  const canSave = Boolean(league && teamId);

  return (
    <Modal title="Sports Scoreboard" onClose={onClose} widthClass="max-w-md">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">League</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS_LEAGUES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => pickLeague(l)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  league === l ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {LEAGUE_META[l].label}
              </button>
            ))}
          </div>
        </div>

        {league && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Team</label>
            {loadingTeams && <p className="text-xs text-muted">Loading {LEAGUE_META[league].label} teams…</p>}
            {teamsError && (
              <p className="rounded-md border border-red-400/30 bg-red-500/5 p-2 text-xs text-red-400">{teamsError}</p>
            )}
            {!loadingTeams && teams && (
              <select
                value={teamId ?? ""}
                onChange={(e) => setTeamId(e.target.value || undefined)}
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Choose a team…
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Defaults to the team name"
            className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Refresh interval (seconds)</label>
          <input
            type="number"
            min={5}
            max={3600}
            value={refreshSeconds}
            onChange={(e) => {
              const n = Number(e.target.value);
              setRefreshSeconds(Number.isFinite(n) ? Math.min(3600, Math.max(5, Math.trunc(n))) : 5);
            }}
            className="w-28 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Card height</label>
          <div className="flex gap-2">
            {(
              [
                { value: "full", label: "Full" },
                { value: "half", label: "Half" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCardSize(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  cardSize === opt.value ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            Same width, less vertical space — Half shows a condensed version of the data.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
