<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, PROBLEMS, type Problem } from '#lib/kb/problems';

  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, string>> } = $props();

  const rows = reports as Report[];
  const groups = $derived(groupByProblem(rows, ticket, tenantOf, notes.oneDayMove));
  const total = $derived(groups.reduce((n, g) => n + g.reports.length, 0));
  const tags = (t: Record<string, number>) =>
    Object.entries(t)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{rows.length}</strong> rows in the export · <strong>{total}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong> {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>what the reports show</th><th>tenants</th><th>seen</th><th>intake tagged</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td>{PROBLEMS[g.problem].shows}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td class="tags">{tags(g.tagged)}</td>
        <td>{#if issues[g.problem]}<a href={issues[g.problem]}>{issues[g.problem]?.replace(/^.*\/issues\//, 'issue ')}</a>{:else}none{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<h3>What fixes each one</h3>
<ul>
  {#each groups as g (g.problem)}
    <li><code>{g.problem}</code> ({g.reports.length}): {PROBLEMS[g.problem].fix}</li>
  {/each}
</ul>

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
</style>
