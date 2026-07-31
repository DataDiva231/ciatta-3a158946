/**
 * Belief Engine — evolving, revisable statements rather than conclusions.
 *
 * Beliefs strengthen, weaken, merge and disappear as observations arrive.
 * Nothing here is a fact, and nothing here is medical: a belief is Ciatta's
 * current best explanation, always open to revision.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { Observation } from "./observations.server";

export type Belief = {
  key: string;
  domain: string;
  statement: string;
  strength: number;
  support: number;
  contradiction: number;
  status: "forming" | "holding" | "fading";
  firstFormedAt: string;
  updatedAt: string;
};

/** Candidate relationships the engine watches for. Rules first, models later. */
type Rule = {
  key: string;
  domain: string;
  statement: string;
  /** Returns +1 when an observation supports the belief, -1 when it counts against it. */
  weigh: (o: Observation, all: Observation[]) => -1 | 0 | 1;
};

const RULES: Rule[] = [
  {
    key: "sleep-recovery",
    domain: "Sleep",
    statement: "Sleep appears strongly connected to how recovered you feel.",
    weigh: (o) => {
      if (o.category !== "Sleep") return 0;
      return o.value === "Barely slept" || o.value === "Restless" || o.value === "Deep" ? 1 : 0;
    },
  },
  {
    key: "mood-before-period",
    domain: "Mood",
    statement: "Mood may shift in the days before your period.",
    weigh: (o) => {
      if (o.category !== "Mood" && o.category !== "Symptoms") return 0;
      const phase = o.context["cyclePhase"];
      if (phase === "luteal") return 1;
      if (phase === "follicular") return -1;
      return 0;
    },
  },
  {
    key: "cycle-stability",
    domain: "Cycle",
    statement: "Your cycle length looks fairly stable.",
    weigh: (o) => (o.category === "Cycle" || o.category === "Flow" ? 1 : 0),
  },
  {
    key: "activity-effect",
    domain: "Movement",
    statement: "Movement is starting to look connected to how the rest of your day goes.",
    weigh: (o) => (o.category === "Activity" ? 1 : 0),
  },
  {
    key: "symptom-clustering",
    domain: "Symptoms",
    statement: "Some symptoms seem to arrive together rather than alone.",
    weigh: (o, all) => {
      if (o.category !== "Symptoms") return 0;
      const sameDay = all.filter(
        (x) =>
          x.category === "Symptoms" &&
          Math.abs(new Date(x.occurredAt).getTime() - new Date(o.occurredAt).getTime()) <
            12 * 3_600_000,
      );
      return sameDay.length > 1 ? 1 : 0;
    },
  },
  {
    key: "flow-intensity",
    domain: "Cycle",
    statement: "Your flow has a shape of its own across a period, not a single level.",
    weigh: (o) => (o.category === "Flow" || o.context["Flow"] ? 1 : 0),
  },
];

function statusFor(strength: number): Belief["status"] {
  if (strength >= 0.6) return "holding";
  if (strength <= 0.12) return "fading";
  return "forming";
}

export async function listBeliefs(subjectId: string): Promise<Belief[]> {
  const { data, error } = await supabaseAdmin
    .from("beliefs")
    .select(
      "key, domain, statement, strength, support, contradiction, status, first_formed_at, updated_at",
    )
    .eq("subject_id", subjectId)
    .order("strength", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    key: row.key,
    domain: row.domain,
    statement: row.statement,
    strength: Number(row.strength),
    support: row.support,
    contradiction: row.contradiction,
    status: row.status as Belief["status"],
    firstFormedAt: row.first_formed_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Revises beliefs against the newest observations. Support nudges strength up
 * with diminishing returns; contradiction pulls it back down. Beliefs that
 * fall far enough are dropped entirely — they simply disappear.
 */
export async function reviseBeliefs(
  subjectId: string,
  fresh: Observation[],
  all: Observation[],
): Promise<{ strengthened: Belief[]; formed: Belief[] }> {
  const before = await listBeliefs(subjectId);
  const byKey = new Map(before.map((b) => [b.key, b]));
  const strengthened: Belief[] = [];
  const formed: Belief[] = [];

  for (const rule of RULES) {
    let support = 0;
    let against = 0;
    for (const o of fresh) {
      const weight = rule.weigh(o, all);
      if (weight === 1) support += 1;
      if (weight === -1) against += 1;
    }
    if (!support && !against) continue;

    const existing = byKey.get(rule.key);
    const priorSupport = (existing?.support ?? 0) + support;
    const priorAgainst = (existing?.contradiction ?? 0) + against;
    // Diminishing returns: evidence matters most early on.
    const strength = Math.max(
      0,
      Math.min(0.95, 1 - Math.exp(-priorSupport / 4) - priorAgainst * 0.06),
    );
    const status = statusFor(strength);

    if (strength < 0.05 && existing) {
      await supabaseAdmin.from("beliefs").delete().eq("subject_id", subjectId).eq("key", rule.key);
      continue;
    }

    const row = {
      subject_id: subjectId,
      key: rule.key,
      domain: rule.domain,
      statement: rule.statement,
      strength,
      support: priorSupport,
      contradiction: priorAgainst,
      status,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin
        .from("beliefs")
        .update(row)
        .eq("subject_id", subjectId)
        .eq("key", rule.key);
      if (strength > existing.strength + 0.05) {
        strengthened.push({ ...existing, ...row, status, firstFormedAt: existing.firstFormedAt });
      }
    } else {
      await supabaseAdmin.from("beliefs").insert(row);
      formed.push({
        ...row,
        status,
        firstFormedAt: new Date().toISOString(),
        updatedAt: row.updated_at,
      });
    }
  }

  return { strengthened, formed };
}
