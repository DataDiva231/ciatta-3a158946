import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'

import { button, h1, text } from './brand'
import { EmailLayout } from './layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview="Choose a new password for Ciatta."
    closing="If this wasn't you, you can safely ignore this email. Your password will remain unchanged."
  >
    <Heading style={h1}>Let&apos;s get you back in.</Heading>
    <Text style={text}>
      You asked to reset your password. Choose a new one and everything
      I&apos;ve learned about you will be right where you left it.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Choose a new password
    </Button>
  </EmailLayout>
)

export default RecoveryEmail
