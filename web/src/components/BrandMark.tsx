// 128px copy of assets/logo.png (the full-size original is ~1 MB).
import logo from '../assets/logo-128.png'

/** The PhoneMail logo: a phone with an envelope. */
export function BrandMark({ size = 38 }: { size?: number }) {
  return <img className="brand-mark" src={logo} width={size} height={size} alt="" />
}
