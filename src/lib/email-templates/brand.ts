// Ciatta email brand tokens — mirrors the app's design language.
// Body background stays #ffffff for email client compatibility.
export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: '#18181B',
}

export const container = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '40px 32px 48px',
  backgroundColor: '#FAF8F5',
}

export const wordmark = {
  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  fontSize: '22px',
  letterSpacing: '0.01em',
  color: '#18181B',
  margin: '0 0 36px',
}

export const h1 = {
  fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  fontSize: '30px',
  fontWeight: 400 as const,
  lineHeight: '1.2',
  color: '#18181B',
  margin: '0 0 18px',
}

export const text = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#55534F',
  margin: '0 0 22px',
}

export const link = { color: '#D96A58', textDecoration: 'none' }

export const button = {
  display: 'inline-block',
  backgroundColor: '#D96A58',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 500 as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
}

export const code = {
  fontFamily: "'SF Mono', Menlo, Courier, monospace",
  fontSize: '26px',
  letterSpacing: '0.18em',
  color: '#18181B',
  margin: '0 0 30px',
}

export const hr = {
  border: 'none',
  borderTop: '1px solid #E8E2DA',
  margin: '36px 0 20px',
}

export const footer = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#9A958E',
  margin: '0',
}
