import * as React from 'react'

import { Button, Heading, Link, Text } from '@react-email/components'

import { button, h1, link, text } from './brand'
import { EmailLayout } from './layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview="Confirm your new email for Ciatta."
    closing="If you didn't request this change, please secure your account immediately."
  >
    <Heading style={h1}>Confirm your new email.</Heading>
    <Text style={text}>
      You asked to move from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      . Confirm below and I&apos;ll begin writing to you there from now on.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirm new email
    </Button>
  </EmailLayout>
)

export default EmailChangeEmail
