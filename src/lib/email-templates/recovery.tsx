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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Choose a new password for {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>ciatta</Text>
        <Heading style={h1}>Let's get you back in.</Heading>
        <Text style={text}>
          You asked to reset your password. Choose a new one and everything I've
          learned about you will be right where you left it.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Choose a new password
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If this wasn't you, you can safely ignore this email — your password
          stays as it is.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
