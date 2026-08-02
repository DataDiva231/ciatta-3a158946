import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'

import { button, h1, text } from './brand'
import { EmailLayout } from './layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <EmailLayout
    preview="One last step — confirm your email."
    closing="If you didn't create a Ciatta account, you can safely ignore this email."
  >
    <Heading style={h1}>Let&apos;s begin.</Heading>
    <Text style={text}>
      One last step. Confirm your email, and we&apos;ll begin building a
      continuous understanding of your body together.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirm email
    </Button>
  </EmailLayout>
)

export default SignupEmail
