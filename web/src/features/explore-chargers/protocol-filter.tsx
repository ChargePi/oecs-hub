import { Checkbox } from '@/components/ui/checkbox'
import { PROTOCOL_OPTIONS } from './filter-manifest'
import { parseProtocolToken, protocolToken } from './filter-state'

export function ProtocolFilter({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const selected = value.map(parseProtocolToken)
  const isSelected = (name: string) => selected.some((p) => p.name === name)
  const withoutProtocol = (name: string) => value.filter((t) => parseProtocolToken(t).name !== name)

  function toggleProtocol(name: string, checked: boolean) {
    onChange(checked ? [...withoutProtocol(name), protocolToken(name)] : withoutProtocol(name))
  }

  function toggleVersion(name: string, version: string, checked: boolean) {
    const versions = selected
      .filter((p) => p.name === name && p.version && p.version !== version)
      .map((p) => p.version as string)
    if (checked) versions.push(version)
    const tokens =
      versions.length > 0 ? versions.map((v) => protocolToken(name, v)) : [protocolToken(name)]
    onChange([...withoutProtocol(name), ...tokens])
  }

  return (
    <div className="flex flex-col gap-1.5 pl-1">
      {PROTOCOL_OPTIONS.map((protocol) => (
        <div key={protocol.name} className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={isSelected(protocol.name)}
              onCheckedChange={(checked) => toggleProtocol(protocol.name, checked === true)}
            />
            {protocol.label}
          </label>
          {protocol.versions && isSelected(protocol.name) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 pl-6">
              {protocol.versions.map((version) => (
                <label
                  key={version.value}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Checkbox
                    checked={selected.some(
                      (p) => p.name === protocol.name && p.version === version.value,
                    )}
                    onCheckedChange={(checked) =>
                      toggleVersion(protocol.name, version.value, checked === true)
                    }
                  />
                  {version.label}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
