import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import {
  button,
  container,
  footer,
  h1,
  hr,
  main,
  text,
  wordmark,
} from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your link back into {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>ciatta</Text>
        <Heading style={h1}>Welcome back.</Heading>
        <Text style={text}>
          Here's your link back in. It expires shortly, so use it while it's
          warm.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Continue to {siteName}
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't ask for this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
