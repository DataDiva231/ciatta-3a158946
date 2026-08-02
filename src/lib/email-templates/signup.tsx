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
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>One last step — confirm your email.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>ciatta</Text>
        <Heading style={h1}>Let&apos;s begin.</Heading>
        <Text style={text}>
          One last step. Confirm your email, and we&apos;ll begin building a
          continuous understanding of your body, together.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm email
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn&apos;t create a Ciatta account, you can safely ignore this
          email.{' '}
          <Link href={siteUrl} style={link}>
            {siteName}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
