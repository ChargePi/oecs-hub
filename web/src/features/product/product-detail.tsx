import {
  Banknote,
  CreditCard,
  FileText,
  MonitorSmartphone,
  Plug,
  PlugZap,
  ShieldCheck,
  Tag,
  Wifi,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { describeValue, fieldDescriptions } from '@/lib/oecs/field-descriptions'
import { formatPricing, formatQuantity, formatValueRange, humanize } from '@/lib/oecs/format'
import type { ChargerVariant } from '@/lib/oecs/types'
import { ManufacturerCard } from './manufacturer-card'
import { ProductImage } from './product-image'
import { RateVariantControl } from './rate-variant-control'
import { RatingsSection } from './ratings-section'
import { boolBadge } from './spec-badges'
import { SpecLinkRow, SpecListRow, SpecRow, SpecSection, ValueTooltip } from './spec-section'

const describeConnectorType = describeValue('connectorType')
const describeProtocolName = describeValue('protocolName')
const describeChargerType = describeValue('chargerType')
const describeAuthenticationMethod = describeValue('authenticationMethod')
const describePaymentMethod = describeValue('paymentMethod')
const describeSmartChargingFeature = describeValue('smartChargingFeature')
const describeConnectivityInterface = describeValue('connectivityInterface')

export function ProductDetail({ variant }: { variant: ChargerVariant }) {
  const { model, manufacturer, hardware, software, payment, pricing, metadata } = variant

  const electrical = hardware.electrical
  const housing = hardware.housing

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{model.name}</h2>
        {model.series && <Badge variant="secondary">{model.series}</Badge>}
      </div>

      <ProductImage
        src={model.productImageUrl}
        alt={model.name}
        className="aspect-square w-full"
      />

      <Separator />

      <div className="flex flex-col gap-6">
        <ManufacturerCard manufacturer={manufacturer} />

        <SpecSection title="Charger type" icon={Tag}>
          <SpecRow
            label="Type"
            value={model.type}
            description={fieldDescriptions['model.type']}
            valueDescription={describeChargerType(model.type)}
          />
          <SpecRow label="Level" value={model.level} />
          <SpecRow label="Status" value={model.status && humanize(model.status)} />
          <SpecRow label="Part number" value={model.partNumber} />
          <SpecRow label="Release date" value={model.releaseDate} />
        </SpecSection>

        <SpecSection title="Power & electrical" icon={Zap}>
          <SpecRow label="Max output power" value={formatQuantity(electrical?.output?.maxPower)} />
          <SpecRow label="Min output power" value={formatQuantity(electrical?.output?.minPower)} />
          <SpecRow label="Input voltage" value={formatValueRange(electrical?.input?.voltage)} />
          <SpecRow
            label="Max input current"
            value={formatQuantity(electrical?.input?.maxCurrent)}
          />
          <SpecRow
            label="Conversion efficiency"
            value={
              electrical?.input?.efficiency != null ? `${electrical.input.efficiency}%` : undefined
            }
          />
          <SpecRow
            label="Simultaneous charging"
            value={boolBadge(electrical?.output?.simultaneousChargingSupported)}
            inline
            wide
          />
          <SpecRow
            label="Form factor"
            value={housing?.formFactor && humanize(housing.formFactor)}
          />
          <SpecRow label="Weight" value={formatQuantity(housing?.weight)} />
        </SpecSection>

        <SpecSection title="Connectors" icon={Plug}>
          {hardware.connectors.map((connector, i) => {
            const ConnectorIcon = connector.currentType === 'DC' ? PlugZap : Plug
            return (
              <div
                key={i}
                className="col-span-full flex items-center justify-between gap-3 border-b border-border/60 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ConnectorIcon className="size-3.5 shrink-0 text-primary" />
                  {connector.label ?? `Connector ${i + 1}`} ·{' '}
                  <ValueTooltip description={describeConnectorType(connector.type)}>
                    {humanize(connector.type)}
                  </ValueTooltip>{' '}
                  ({connector.currentType})
                </span>
                <span className="shrink-0 text-right font-medium">
                  {formatQuantity(connector.maxPower) ?? '—'}
                </span>
              </div>
            )
          })}
        </SpecSection>

        <SpecSection title="User interface" icon={MonitorSmartphone}>
          <SpecRow
            label="Display"
            value={
              hardware.userInterface?.display?.type && humanize(hardware.userInterface.display.type)
            }
          />
          <SpecListRow
            label="Authentication"
            description={fieldDescriptions['hardware.userInterface.authenticationMethods']}
            items={hardware.userInterface?.authenticationMethods?.map((method) => ({
              text: humanize(method),
              description: describeAuthenticationMethod(method),
            }))}
          />
        </SpecSection>

        <SpecSection title="Payment" icon={CreditCard}>
          <SpecRow
            label="Ad-hoc payment"
            value={boolBadge(payment?.adHocPaymentSupported)}
            inline
            wide
          />
          <SpecListRow
            label="Supported payment options"
            description={fieldDescriptions['payment.acceptedMethods']}
            items={payment?.acceptedMethods?.map((method) => ({
              text: humanize(method),
              description: describePaymentMethod(method),
            }))}
          />
        </SpecSection>

        {pricing && (
          <SpecSection title="Pricing" icon={Banknote}>
            <SpecListRow label="MSRP" items={formatPricing(pricing)?.map((text) => ({ text }))} />
            <SpecRow label="Notes" value={pricing.notes} />
          </SpecSection>
        )}

        <SpecSection title="Software & connectivity" icon={Wifi}>
          <SpecRow
            label="Offline charging"
            value={boolBadge(software.offlineChargingSupported)}
            inline
            wide
          />
          <SpecListRow
            label="Protocols"
            description={fieldDescriptions['software.protocols[]']}
            items={software.protocols.map((p) => ({
              text: `${p.name} ${p.version}`,
              description: describeProtocolName(p.name),
            }))}
          />
          <SpecListRow
            label="Smart charging"
            description={fieldDescriptions['software.smartCharging.features']}
            items={software.smartCharging?.features?.map((feature) => ({
              text: humanize(feature),
              description: describeSmartChargingFeature(feature),
            }))}
          />
          <SpecListRow
            label="Connectivity"
            description={fieldDescriptions['hardware.connectivity.interfaces']}
            items={hardware.connectivity?.interfaces?.map((iface) => ({
              text: humanize(iface),
              description: describeConnectivityInterface(iface),
            }))}
          />
        </SpecSection>

        {hardware.certifications && hardware.certifications.length > 0 && (
          <SpecSection title="Certifications" icon={ShieldCheck}>
            <SpecLinkRow
              label="Standards"
              items={hardware.certifications.map((cert) => ({
                label: cert.standard,
                url: cert.documentUrl,
              }))}
            />
          </SpecSection>
        )}

        {metadata?.sources && metadata.sources.length > 0 && (
          <SpecSection title="Documents" icon={FileText}>
            <SpecLinkRow
              label="Manuals & specifications"
              items={metadata.sources.map((source) => ({
                label: source.title,
                url: source.url,
              }))}
            />
          </SpecSection>
        )}

        <RatingsSection ratings={variant.ratings} />
        <RateVariantControl variantId={variant.id} />
      </div>
    </div>
  )
}
