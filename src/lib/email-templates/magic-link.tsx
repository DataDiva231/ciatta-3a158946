import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'

import { button, h1, text } from './brand'
import { EmailLayout } from './layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout
    preview="Your secure sign-in link for Ciatta."
    closing="If you didn't request this link, you can safely ignore this email."
  >
    <Heading style={h1}>Welcome back.</Heading>
    <Text style={text}>
      Here&apos;s your secure sign-in link. It expires shortly, so use it while
      it&apos;s warm.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Continue to Ciatta
    </Button>
  </EmailLayout>
)

export default MagicLinkEmail
