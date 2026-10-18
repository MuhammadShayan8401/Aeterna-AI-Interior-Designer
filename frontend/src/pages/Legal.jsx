/** Legal — Terms & Conditions, Privacy Policy, Refund Policy. */
import { Link } from 'react-router-dom'
import { useEffect } from 'react'

const H = { fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, letterSpacing: '-0.015em' }
const P = { fontSize: 14, lineHeight: 1.75, color: '#555', fontFamily: 'Inter, sans-serif', margin: '0 0 1rem' }
const UPDATED = '17 October 2026'
const MAIL = 'm.shayan.8401@gmail.com'

const DOCS = {
  terms: {
    title: 'Terms & Conditions',
    sections: [
      ['1. Acceptance', 'By creating an account or using Aeterna ("the Service") you agree to these Terms. If you do not agree, please do not use the Service.'],
      ['2. The Service', 'Aeterna generates interior design images with artificial intelligence from photos or text you provide. Results are creative suggestions, not architectural, engineering or construction advice, and may contain errors or unrealistic details.'],
      ['3. Your account', 'You must provide a valid email address and keep your password secret. You are responsible for activity under your account. You must be at least 18, or have a parent or guardian\'s permission. We may suspend accounts that break these Terms.'],
      ['4. Acceptable use', 'Do not upload content you have no right to use, or anything unlawful, hateful, sexual or that shows other people without their consent. Do not attempt to overload, scrape, reverse-engineer or bypass the usage limits of the Service, or resell access to it.'],
      ['5. Your content and our output', 'You keep ownership of the photos you upload. You grant us a limited licence to process them only to provide the Service. You may use the designs generated for you for personal or commercial purposes, but because they are AI-generated we cannot guarantee they are unique or free of similarities to other works.'],
      ['6. Plans and usage limits', 'Free accounts have a daily design limit. The Pro plan raises that limit for the period you paid for. Limits, prices and features may change; changes never reduce a period you have already paid for.'],
      ['7. Payments', 'Pro is paid in Pakistani rupees (PKR) by Easypaisa transfer to the account shown on the Pricing page (Muhammad Shayan Ahmed, +923151032255). After paying, you submit the Easypaisa transaction ID. Pro is activated once we have confirmed the payment, normally within 24 hours. Submitting a false or someone else\'s transaction ID may lead to account suspension. Always check the account name and number before sending money; we will never ask you to pay anywhere else.'],
      ['8. Refunds', 'See our Refund Policy.'],
      ['9. Availability', 'The Service runs on shared infrastructure and is provided "as is" and "as available". Generation may be slow or temporarily unavailable. We do not guarantee uninterrupted or error-free operation.'],
      ['10. Limitation of liability', 'To the extent permitted by law, Aeterna and its owner are not liable for indirect or consequential losses, or for decisions you make based on generated designs. Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.'],
      ['11. Termination', 'You can delete your account at any time from the Account page. We may suspend or end the Service or an account that breaks these Terms.'],
      ['12. Changes and governing law', 'We may update these Terms; the date below shows the latest version, and continued use means you accept it. These Terms are governed by the laws of Pakistan.'],
      ['13. Contact', `Questions: ${MAIL}`],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['What we collect', 'Your name, email address and a hashed password (Argon2); the photos and text options you submit; the designs generated for you, your ratings and favourites; usage counts for daily limits; and, for Pro payments, the Easypaisa transaction ID, amount and the number you paid from (if you enter it).'],
      ['How we use it', 'To run your account, generate and store your designs, enforce limits, verify payments, send account emails (verification, password reset, payment updates) and keep the Service secure.'],
      ['Photos', 'Uploaded photos are used only to generate your designs. Your history keeps the generated images and a small copy of your photo for the before/after view; delete an item or your account to remove them.'],
      ['Sharing', 'We do not sell your data. It is processed by the services that run Aeterna: Hugging Face (hosting), MongoDB Atlas (database) and our email provider (Brevo or Resend). We may disclose information if the law requires it.'],
      ['Security & retention', 'Passwords are never stored in clear text and sessions use short-lived tokens. Deleting your account removes your profile, history and sessions. Payment records may be kept for accounting and dispute purposes.'],
      ['Your choices', `You can change your password or delete your account on the Account page. For access or correction requests, write to ${MAIL}.`],
    ],
  },
  refunds: {
    title: 'Refund Policy',
    sections: [
      ['Pro plan', 'Because Pro gives immediate access to extra capacity, payments are generally non-refundable once Pro has been activated and used.'],
      ['When we will refund', 'If you were charged but Pro was not activated within 48 hours, if you paid twice for the same period, or if a technical fault on our side prevented you from using the Service for most of the period, we will refund the affected amount (or extend your Pro period instead, if you prefer).'],
      ['How to request', `Email ${MAIL} within 7 days of payment with your account email and the Easypaisa transaction ID. Approved refunds are sent back to the Easypaisa account the payment came from, normally within 5 working days.`],
    ],
  },
}

export default function Legal({ doc }) {
  const d = DOCS[doc]
  useEffect(() => { window.scrollTo(0, 0) }, [doc])
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <span className="eyebrow">Legal</span>
      <h1 style={{ ...H, fontSize: 'clamp(2rem,4vw,3rem)', margin: '6px 0 .5rem', lineHeight: 1.05 }}>{d.title}</h1>
      <p style={{ ...P, fontSize: 12, color: '#999' }}>Last updated {UPDATED}</p>
      {d.sections.map(([h, t]) => (
        <div key={h}>
          <h2 style={{ ...H, fontSize: '1.25rem', margin: '2rem 0 .6rem' }}>{h}</h2>
          <p style={P}>{t}</p>
        </div>
      ))}
      <p style={{ ...P, marginTop: '2.5rem', fontSize: 13 }}>
        <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/refunds">Refunds</Link>
      </p>
    </div>
  )
}
