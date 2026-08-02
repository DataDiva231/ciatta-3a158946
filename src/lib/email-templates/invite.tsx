import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'

import { button, h1, text } from './brand'
import { EmailLayout } from './layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview="You've been invited to Ciatta."
    closing="If you weren't expecting this invitation, you can safely ignore this email."
  >
    <Heading style={h1}>You&apos;ve been invited.</Heading>
    <Text style={text}>
      Someone thought Ciatta belonged in your life. Accept the invitation and
      begin building your continuous understanding together.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Accept invitation
    </Button>
  </EmailLayout>
)

export default InviteEmail
