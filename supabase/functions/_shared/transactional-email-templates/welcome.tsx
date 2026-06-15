/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  vaultUrl?: string
}

const Email = ({ name, vaultUrl = 'https://z1insights.com/vault' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Z1 Vault is unlocked.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}>
          <Text style={brandMark}>Z1 INSIGHTS</Text>
        </Section>
        <Heading style={h1}>{name ? `Welcome, ${name}.` : 'Welcome.'}</Heading>
        <Text style={lede}>
          Your lifetime vault is unlocked. The full book, AI tutor, quizzes, and your
          private notebook — all yours, forever.
        </Text>
        <Section style={ctaWrap}>
          <Button style={button} href={vaultUrl}>Enter the Vault</Button>
        </Section>
        <Hr style={hr} />
        <Text style={tip}><strong>Start here</strong></Text>
        <Text style={text}>
          1. Read Chapter 1 — the foundations.<br />
          2. Take the chapter quiz to lock it in.<br />
          3. Ask the AI tutor anything from the book.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Z1 INSIGHTS — Educational content only. Not financial advice.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to Z1 INSIGHTS — your vault is unlocked',
  displayName: 'Welcome email',
  previewData: { name: 'Trader', vaultUrl: 'https://z1insights.com/vault' },
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
const h1 = { fontSize: '28px', color: INK, margin: '12px 0 16px', fontWeight: 600 as const, letterSpacing: '-0.01em' }
const lede = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.55', margin: '0 0 28px' }
const ctaWrap = { margin: '8px 0 24px' }
const button = {
  backgroundColor: INK, color: '#ffffff', fontSize: '14px', borderRadius: '12px',
  padding: '14px 22px', textDecoration: 'none', fontWeight: 600 as const, display: 'inline-block',
  border: `1px solid ${GOLD}`,
}
const hr = { borderColor: '#eee', margin: '28px 0' }
const tip = { fontSize: '13px', color: GOLD, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#3a3a3a', lineHeight: '1.7', margin: '0 0 12px' }
const footer = { fontSize: '11px', color: '#999', margin: '20px 0 0' }