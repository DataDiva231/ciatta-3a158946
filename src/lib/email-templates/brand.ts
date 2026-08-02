// Ciatta email brand tokens — premium minimalist, editorial restraint.
// No icons, illustrations, shadows, gradients, or borders beyond hairline rules.

export const IVORY = '#F8F6F3'
export const INK = '#111111'
export const RULE = '#DDD8D2'
export const MUTED = '#8A857E'
export const BODY_GRAY = '#3A3733'
export const CREAM = '#F1EDE7'

export const SERIF =
  "'Instrument Serif', 'Iowan Old Style', Georgia, 'Times New Roman', serif"
export const SANS =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

// Email clients require #ffffff on <Body>; the ivory canvas lives on the wrapper.
export const main = {
  backgroundColor: '#ffffff',
  fontFamily: SANS,
  color: INK,
  margin: '0',
  padding: '0',
}

export const canvas = {
  backgroundColor: IVORY,
  padding: '0',
  width: '100%',
}

export const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0 32px',
  backgroundColor: IVORY,
}

export const headerSection = {
  padding: '56px 0 28px',
  textAlign: 'center' as const,
}

export const wordmark = {
  fontFamily: SERIF,
  fontSize: '34px',
  lineHeight: '1',
  letterSpacing: '0.005em',
  color: INK,
  margin: '0',
  textAlign: 'center' as const,
}

export const hr = {
  border: 'none',
  borderTop: `1px solid ${RULE}`,
  margin: '0',
  width: '100%',
}

export const contentSection = {
  padding: '52px 0 56px',
}

export const h1 = {
  fontFamily: SERIF,
  fontSize: '56px',
  fontWeight: 400 as const,
  lineHeight: '1.05',
  letterSpacing: '-0.015em',
  color: INK,
  margin: '0 0 26px',
}

export const text = {
  fontFamily: SANS,
  fontSize: '20px',
  lineHeight: '1.6',
  color: BODY_GRAY,
  margin: '0 0 40px',
  maxWidth: '520px',
}

export const link = { color: INK, textDecoration: 'underline' }

export const button = {
  display: 'inline-block',
  backgroundColor: INK,
  color: '#FFFFFF',
  fontFamily: SANS,
  fontSize: '17px',
  fontWeight: 500 as const,
  lineHeight: '58px',
  height: '58px',
  minWidth: '260px',
  borderRadius: '999px',
  padding: '0 36px',
  textAlign: 'center' as const,
  textDecoration: 'none',
}

export const codeCard = {
  backgroundColor: CREAM,
  border: `1px solid ${RULE}`,
  borderRadius: '14px',
  padding: '28px 20px',
  textAlign: 'center' as const,
  maxWidth: '440px',
  margin: '0 0 40px',
}

export const codeText = {
  fontFamily: SANS,
  fontSize: '34px',
  fontWeight: 500 as const,
  lineHeight: '1',
  letterSpacing: '0.22em',
  color: INK,
  margin: '0',
  textAlign: 'center' as const,
}

export const note = {
  fontFamily: SANS,
  fontSize: '15px',
  lineHeight: '1.6',
  color: MUTED,
  margin: '0',
}

export const footerSection = {
  padding: '28px 0 12px',
}

export const footerWordmark = {
  fontFamily: SERIF,
  fontSize: '22px',
  lineHeight: '1',
  color: INK,
  margin: '0',
}

export const footerLinks = {
  fontFamily: SANS,
  fontSize: '13px',
  lineHeight: '1',
  color: MUTED,
  margin: '0',
  textAlign: 'right' as const,
}

export const footerLink = { color: MUTED, textDecoration: 'none' }

export const copyright = {
  fontFamily: SANS,
  fontSize: '12px',
  lineHeight: '1.6',
  color: MUTED,
  margin: '24px 0 14px',
  textAlign: 'center' as const,
}

export const disclaimer = {
  fontFamily: SANS,
  fontSize: '11px',
  lineHeight: '1.7',
  color: MUTED,
  margin: '0 0 48px',
  textAlign: 'center' as const,
  maxWidth: '480px',
}

export const PRIVACY_URL = 'https://ciatta.io/privacy'
export const HELP_URL = 'https://ciatta.io/terms'
