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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>One step before we begin — confirm your email.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>ciatta</Text>
        <Heading style={h1}>Let's begin.</Heading>
        <Text style={text}>
          Confirm {recipient} and I'll start learning you — quietly, at your
          pace.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm email
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
