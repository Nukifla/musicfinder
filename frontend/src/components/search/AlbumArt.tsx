import { Music } from 'lucide-react'
import { useState } from 'react'

interface Props {
  url: string | null
  title: string
  size?: number
}

export default function AlbumArt({ url, title, size = 48 }: Props) {
  const [failed, setFailed] = useState(false)

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
