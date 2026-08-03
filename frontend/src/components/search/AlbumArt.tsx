import { Music } from 'lucide-react'
import { useState } from 'react'

interface Props {
  url: string | null
  title: string
  size?: number
  /** Fill mode: sizes itself to 100% of its parent (aspect-square) instead of
   * a fixed pixel box — use inside responsive grids where the column width
   * varies (e.g. the artist page album grid), so the no-art placeholder can
   * never overflow a narrow column. */
  fill?: boolean
}

export default function AlbumArt({ url, title, size = 48, fill = false }: Props) {
  const [failed, setFailed] = useState(false)

  if (fill) {
    if (!url || failed) {
      return (
        <div className="w-full aspect-square rounded-md bg-surface-hover flex items-center justify-center shrink-0">
          <Music className="w-2/5 h-2/5 text-zinc-600" />
        </div>
      )
    }
    return (
      <img
        src={url}
        alt={title}
        className="w-full aspect-square rounded-md object-cover shrink-0"
        onError={() => setFailed(true)}
      />
    )
  }

  if (!url || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-md bg-surface-hover flex items-center justify-center shrink-0"
      >
        <Music size={size * 0.4} className="text-zinc-600" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={title}
      width={size}
      height={size}
      className="rounded-md object-cover shrink-0"
      onError={() => setFailed(true)}
    />
  )
}
