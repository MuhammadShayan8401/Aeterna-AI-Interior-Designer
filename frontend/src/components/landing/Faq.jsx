/** FAQ — answers the questions people ask before signing up or paying. */
const QA = [
  ['Is it free?', 'Yes. Every account gets free designs every day. Pro raises the daily limit and costs a small monthly amount in PKR.'],
  ['How long does a design take?', 'Usually one to a few minutes, depending on how busy the shared server is. You see progress while it works.'],
  ['What photo works best?', 'A bright, straight-on photo of the whole room. JPG, PNG or WEBP up to 10 MB.'],
  ['How do I pay for Pro?', 'Send the amount by Easypaisa (or another listed method), then enter the transaction ID on the Pricing page. Pro is switched on after we confirm it, normally within a day.'],
  ['Can I share or print my designs?', 'Yes. Download a bigger version, create a public before/after link, or print a mood board with a budget estimate as a PDF.'],
  ['Are the budget numbers exact?', 'No. They are rough PKR ranges to help you plan; real prices vary by shop and quality.'],
  ['What happens to my photos?', 'They are used only to make your designs. You can delete any design, or your whole account, at any time.'],
]

import { useT } from '../../i18n'

export default function Faq() {
  const { t } = useT()
  return (
    <section style={{ padding: '4.5rem 0', borderTop: '1px solid #E5E5E5' }} aria-labelledby="faq-h">
      <span className="eyebrow">{t('FAQ')}</span>
      <h2 id="faq-h" style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: 'clamp(1.6rem,3vw,2.4rem)', letterSpacing: '-0.02em', margin: '6px 0 1.5rem' }}>
        {t('Good questions')}
      </h2>
      <div style={{ maxWidth: 760 }}>
        {QA.map(([q, a]) => (
          <details key={q} style={{ borderBottom: '1px solid #E5E5E5', padding: '14px 0', fontFamily: 'Inter, sans-serif' }}>
            <summary style={{ cursor: 'pointer', fontSize: 15, fontWeight: 500 }}>{q}</summary>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, margin: '8px 0 0' }}>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
