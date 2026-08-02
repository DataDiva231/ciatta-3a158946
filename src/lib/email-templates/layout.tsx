import * as React from 'react'

import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

import {
  HELP_URL,
  PRIVACY_URL,
  canvas,
  container,
  contentSection,
  copyright,
  disclaimer,
  footerLink,
  footerLinks,
  footerSection,
  footerWordmark,
  headerSection,
  hr,
  main,
  note,
  wordmark,
} from './brand'

interface LayoutProps {
  preview: string
  children: React.ReactNode
  /** Small muted closing line above the footer. */
  closing: React.ReactNode
}

export const EmailLayout = ({ preview, children, closing }: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Section style={canvas}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={wordmark}>ciatta</Text>
          </Section>
          <Hr style={hr} />

          <Section style={contentSection}>
            {children}
            <Text style={note}>{closing}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Row>
              <Column>
                <Text style={footerWordmark}>ciatta</Text>
              </Column>
              <Column>
                <Text style={footerLinks}>
                  <Link href={PRIVACY_URL} style={footerLink}>
                    Privacy Policy
                  </Link>
                  {'  |  '}
                  <Link href={HELP_URL} style={footerLink}>
                    Help Center
                  </Link>
                </Text>
              </Column>
            </Row>
            <Text style={copyright}>© 2026 Ciatta. All rights reserved.</Text>
            <Text style={disclaimer}>
              Ciatta products and services are not medical devices and are not
              intended to diagnose, treat, cure, or prevent any disease or
              condition. If you have concerns about your health, please consult
              a qualified healthcare professional.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default EmailLayout
