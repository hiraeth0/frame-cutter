import type { FC, SVGProps } from 'react'

type SvgElementProps = Omit<SVGProps<SVGSVGElement>, 'height' | 'width'>

export type IconComponent = FC<SvgElementProps & { color?: string; size?: number }>
