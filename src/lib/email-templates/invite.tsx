import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

import {
  button,
  container,
  footer,
  h1,
  hr,
  link,
  main,
  text,
  wordmark,
} from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>ciatta</Text>
        <Heading style={h1}>You've been invited.</Heading>
        <Text style={text}>
          Someone thought {siteName} belonged in your life. Accept the
          invitation and I'll start from the beginning with you.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept invitation
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If you weren't expecting this, you can safely ignore this email.{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
