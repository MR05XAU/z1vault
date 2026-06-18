/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  subject?: string
  heading?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  promoCode?: string
  promoNote?: string
  name?: string
}

const Email = ({
  heading = 'A note from Z1 INSIGHTS',
  body = '',
  ctaLabel,
  ctaUrl,
  promoCode,
  promoNote,
  name,
}: Props) => {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandMark}>Z1 INSIGHTS</Text>
          </Section>
          <Heading style={h1}>{heading}</Heading>
          {name && <Text style={lede}>Hi {name},</Text>}
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>{p}</Text>
          ))}
          {promoCode && (
            <Section style={promoBox}>
              <Text style={promoLabel}>Your code</Text>
              <Text style={promoCodeStyle}>{promoCode}</Text>
              {promoNote && <Text style={promoNoteStyle}>{promoNote}</Text>}
            </Section>
          )}
          {ctaUrl && ctaLabel && (
            <Section style={ctaWrap}>
              <Button style={button} href={ctaUrl}>{ctaLabel}</Button>
            </Section>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            Z1 INSIGHTS — Educational content only. Not financial advice.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Props) => data.subject || 'Update from Z1 INSIGHTS',
  displayName: 'Announcement / offer',
  previewData: {
    subject: 'A gift for you',
    heading: 'A gift for you',
    body: 'Use the code below for 20% off lifetime access.\n\nValid for 7 days.',
    ctaLabel: 'Claim your vault',
    ctaUrl: 'https://z1insights.com/paywall',
    promoCode: 'Z1-VIP-20',
    promoNote: 'Apply at checkout. Valid for 7 days.',
    name: 'Trader',
  },
} satisfies TemplateEntry

const GOLD = '#C8A659'
const INK = '#0B0C10'
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const brand = { paddingBottom: '8px' }
const brandMark = {
  fontSize: '11px', letterSpacing: '0.32em', color: GOLD,
  textTransform: 'uppercase' as const, fontWeight: 700, margin: 0,
}
const h1 = { fontSize: '26px', color: INK, margin: '12px 0 16px', fontWeight: 600 as const, letterSpacing: '-0.01em' }
const lede = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.55', margin: '0 0 14px' }
const text = { fontSize: '14px', color: '#3a3a3a', lineHeight: '1.7', margin: '0 0 14px' }
const ctaWrap = { margin: '20px 0 24px' }
const button = {
  backgroundColor: INK, color: '#ffffff', fontSize: '14px', borderRadius: '12px',
  padding: '14px 22px', textDecoration: 'none', fontWeight: 600 as const, display: 'inline-block',
  border: `1px solid ${GOLD}`,
}
const promoBox = {
  border: `1px dashed ${GOLD}`, borderRadius: '14px', padding: '18px 16px',
  margin: '18px 0', textAlign: 'center' as const, backgroundColor: '#FBF6EA',
}
const promoLabel = {
  fontSize: '10px', letterSpacing: '0.3em', color: GOLD,
  textTransform: 'uppercase' as const, margin: '0 0 6px', fontWeight: 700 as const,
}
const promoCodeStyle = {
  fontSize: '22px', color: INK, margin: '0 0 6px', fontWeight: 700 as const,
  letterSpacing: '0.08em', fontFamily: 'Menlo, Consolas, monospace',
}
const promoNoteStyle = { fontSize: '12px', color: '#666', margin: 0 }
const hr = { borderColor: '#eee', margin: '28px 0' }
const footer = { fontSize: '11px', color: '#999', margin: '20px 0 0' }