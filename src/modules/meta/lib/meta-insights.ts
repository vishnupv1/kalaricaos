export type MetaInsightAction = { action_type?: string; value?: string };

export type ParsedMetaInsights = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  messagingConversations: number;
  leadSubmissions: number;
  rawActions: MetaInsightAction[];
};

function parseActionValue(value: string | undefined): number {
  if (!value) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function sumActions(actions: MetaInsightAction[] | undefined, matcher: (type: string) => boolean): number {
  let total = 0;
  for (const action of actions ?? []) {
    const type = action.action_type?.toLowerCase() ?? "";
    if (!matcher(type)) continue;
    total += parseActionValue(action.value);
  }
  return total;
}

export function parseMetaInsightRow(row: {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: MetaInsightAction[];
}): ParsedMetaInsights {
  const actions = row.actions ?? [];

  return {
    spend: parseActionValue(row.spend),
    impressions: parseActionValue(row.impressions),
    reach: parseActionValue(row.reach),
    clicks: parseActionValue(row.clicks),
    messagingConversations: sumActions(actions, (type) => type.includes("messaging_conversation")),
    leadSubmissions: sumActions(
      actions,
      (type) => type === "lead" || type.includes("lead_grouped") || type.includes("onsite_conversion.lead"),
    ),
    rawActions: actions,
  };
}

export function aggregateParsedInsights(rows: ParsedMetaInsights[]): ParsedMetaInsights {
  return rows.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      impressions: acc.impressions + row.impressions,
      reach: acc.reach + row.reach,
      clicks: acc.clicks + row.clicks,
      messagingConversations: acc.messagingConversations + row.messagingConversations,
      leadSubmissions: acc.leadSubmissions + row.leadSubmissions,
      rawActions: acc.rawActions,
    }),
    {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      messagingConversations: 0,
      leadSubmissions: 0,
      rawActions: [] as MetaInsightAction[],
    },
  );
}
