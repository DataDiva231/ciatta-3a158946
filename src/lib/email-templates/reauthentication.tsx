import * as React from 'react'

import { Heading, Section, Text } from '@react-email/components'

import { codeCard, codeText, h1, text } from './brand'
import { EmailLayout } from './layout'

interface ReauthenticationEmailProps {
  token: string
}

const spaced = (token: string) => token.split('').join(' ')

export const ReauthenticationEmail = ({
  token,
}: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Your Ciatta sign-in code."
    closing="If you didn't request this code, you can safely ignore this email."
  >
    <Heading style={h1}>Your sign-in code.</Heading>
    <Text style={text}>
      Welcome back. Use the six-digit code below to complete your sign-in. This
      code expires in 15 minutes and can only be used once.
    </Text>
    <Section style={codeCard}>
      <Text style={codeText}>{spaced(token)}</Text>
    </Section>
  </EmailLayout>
)

export default ReauthenticationEmail
