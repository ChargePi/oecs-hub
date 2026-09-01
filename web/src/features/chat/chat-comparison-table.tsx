import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ComparisonTable as ComparisonTableData } from '@/lib/chat/types'

/** "max_power_kw" -> "Max power kw" - just enough to read as a label, not a full unit
 *  formatter (the agent's own attribute names are already short and self-explanatory). */
function humanizeAttribute(attribute: string): string {
  const spaced = attribute.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Renders ComposeComparison's deterministic side-by-side attribute table (see
 * oecs-recommendation-agent's activities.ComparisonTable) as an actual table - one
 * column per charger, one row per attribute. Purely informational (unlike
 * ChatClarifyForm, nothing here is submitted back), so it renders the same whether
 * it's the latest message or an earlier one in history.
 */
export function ChatComparisonTable({ table }: { table: ComparisonTableData }) {
  if (table.chargers.length === 0) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Attribute</TableHead>
          {table.chargers.map((charger) => (
            <TableHead key={charger.id}>
              {charger.manufacturerName} {charger.modelName}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row) => (
          <TableRow key={row.attribute}>
            <TableCell className="font-medium">{humanizeAttribute(row.attribute)}</TableCell>
            {row.values.map((value, i) => (
              <TableCell key={table.chargers[i]?.id ?? i}>{value || '—'}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
