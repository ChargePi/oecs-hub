import { ProductImage } from './product-image'

/** A charger's compact identity: thumbnail, model name and manufacturer. */
export function ChargerSummary({
  imageUrl,
  modelName,
  manufacturerName,
}: {
  imageUrl?: string
  modelName: string
  manufacturerName: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <ProductImage src={imageUrl} alt={modelName} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{modelName}</p>
        <p className="truncate text-xs text-muted-foreground">{manufacturerName}</p>
      </div>
    </div>
  )
}
