import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import {
  code,
  container,
  footer,
  h1,
  hr,
  main,
  text,
  wordmark,
} from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({
  token,
}: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>ciatta</Text>
        <Heading style={h1}>Just checking it's you.</Heading>
        <Text style={text}>Use this code to confirm it's really you:</Text>
        <Text style={code}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
