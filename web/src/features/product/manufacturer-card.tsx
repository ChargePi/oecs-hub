import { Globe, MapPin, Phone } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { countryFlag } from '@/lib/oecs/format'
import type { Manufacturer } from '@/lib/oecs/types'
import { SpecRow, SpecSection } from './spec-section'

export function ManufacturerCard({ manufacturer }: { manufacturer: Manufacturer }) {
  const flag = countryFlag(manufacturer.country)

  return (
    <SpecSection title="Manufacturer">
      <SpecRow label="Name" value={manufacturer.name} />
      <SpecRow
        label="Country"
        inline
        value={
          manufacturer.country && (
            <Badge variant="outline" className="gap-1">
              {flag ? <span>{flag}</span> : <MapPin className="size-3" />}
              {manufacturer.country}
            </Badge>
          )
        }
      />
      <SpecRow label="Contact" value={manufacturer.contact?.name} />
      <SpecRow label="Email" value={manufacturer.contact?.email} wide />
      <SpecRow
        label="Phone"
        inline
        wide
        value={
          manufacturer.contact?.phone && (
            <Badge variant="outline" className="gap-1">
              <Phone className="size-3" />
              {manufacturer.contact.phone}
            </Badge>
          )
        }
      />
      <SpecRow
        label="Website"
        inline
        wide
        value={
          manufacturer.contact?.website && (
            <Badge variant="outline" asChild>
              <a
                href={manufacturer.contact.website}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer gap-1 hover:bg-muted"
              >
                <Globe className="size-3" />
                {manufacturer.contact.website}
              </a>
            </Badge>
          )
        }
      />
    </SpecSection>
  )
}
