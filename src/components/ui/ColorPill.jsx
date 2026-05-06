import { getColorByValue } from '../../lib/constants'

export default function ColorPill({ color, name, size = 'sm' }) {
  const colorObj = typeof color === 'string' ? getColorByValue(color) : color
  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]} ${colorObj.light} ${colorObj.dark}`}
    >
      {name}
    </span>
  )
}
