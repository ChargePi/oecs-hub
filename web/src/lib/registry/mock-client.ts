import { chargerVariants } from '@/lib/oecs/fixtures'
import type { ChargerVariant, Manufacturer, Product } from '@/lib/oecs/types'
import type {
  ManufacturerGraph,
  ManufacturerSummary,
  RegistryClient,
  SearchResult,
  SubmitChargerSpecResult,
  SubmitVariantRatingInput,
  SubmitVariantRatingResult,
} from './types'

const SIMULATED_LATENCY_MS = 220

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

function groupIntoProducts(variants: ChargerVariant[]): Map<string, Product> {
  const products = new Map<string, Product>()

  for (const variant of variants) {
    const series = variant.model.series ?? variant.model.name
    const productId = `${variant.manufacturer.id}-${series}`
    const existing = products.get(productId)

    if (existing) {
      existing.variants.push(variant)
    } else {
      products.set(productId, {
        id: productId,
        manufacturerId: variant.manufacturer.id,
        series,
        variants: [variant],
      })
    }
  }

  return products
}

function uniqueManufacturers(variants: ChargerVariant[]): Manufacturer[] {
  const byId = new Map<string, Manufacturer>()
  for (const variant of variants) {
    byId.set(variant.manufacturer.id, variant.manufacturer)
  }
  return [...byId.values()]
}

export class MockRegistryClient implements RegistryClient {
  async listManufacturers(): Promise<ManufacturerSummary[]> {
    const products = groupIntoProducts(chargerVariants)
    const manufacturers = uniqueManufacturers(chargerVariants)

    const summaries = manufacturers.map((manufacturer) => {
      const ownProducts = [...products.values()].filter(
        (product) => product.manufacturerId === manufacturer.id,
      )
      return {
        ...manufacturer,
        productCount: ownProducts.length,
        variantCount: ownProducts.reduce((sum, product) => sum + product.variants.length, 0),
      }
    })

    return delay(summaries.sort((a, b) => a.name.localeCompare(b.name)))
  }

  async getManufacturerGraph(manufacturerId: string): Promise<ManufacturerGraph | null> {
    const variants = chargerVariants.filter((v) => v.manufacturer.id === manufacturerId)
    if (variants.length === 0) return delay(null)

    const products = [...groupIntoProducts(variants).values()]
    return delay({ manufacturer: variants[0].manufacturer, products })
  }

  async searchCatalog(query: string): Promise<SearchResult[]> {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return delay([])

    const results: SearchResult[] = []
    const seenProducts = new Set<string>()
    const products = groupIntoProducts(chargerVariants)

    for (const manufacturer of uniqueManufacturers(chargerVariants)) {
      if (manufacturer.name.toLowerCase().includes(normalized)) {
        results.push({
          type: 'manufacturer',
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          label: manufacturer.name,
        })
      }
    }

    for (const product of products.values()) {
      if (seenProducts.has(product.id)) continue
      const manufacturerName = product.variants[0].manufacturer.name
      const label = `${manufacturerName} ${product.series}`
      if (label.toLowerCase().includes(normalized)) {
        results.push({
          type: 'product',
          manufacturerId: product.manufacturerId,
          manufacturerName,
          productId: product.id,
          label,
        })
        seenProducts.add(product.id)
      }
    }

    return delay(results.slice(0, 8))
  }

  async getVariant(variantId: string): Promise<ChargerVariant | null> {
    const variant = chargerVariants.find((v) => v.id === variantId) ?? null
    return delay(variant)
  }

  async listVariants(): Promise<ChargerVariant[]> {
    return delay(chargerVariants)
  }

  async submitChargerSpec(): Promise<SubmitChargerSpecResult> {
    return delay({ id: crypto.randomUUID(), status: 'submitted' })
  }

  async submitVariantRating(
    variantId: string,
    ratings: SubmitVariantRatingInput[],
  ): Promise<SubmitVariantRatingResult> {
    return delay({
      variantId,
      ratings: ratings.map((r) => ({ categoryName: r.categoryName, average: r.score, count: 1 })),
    })
  }
}
