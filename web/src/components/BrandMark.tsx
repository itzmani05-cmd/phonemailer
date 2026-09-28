import logo from '../assets/logo-128.png'

export function BrandMark({ size = 38 }: { size?: number }) {
  return <img className="brand-mark" src={logo} width={size} height={size} alt="" />
}
