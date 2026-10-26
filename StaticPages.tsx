import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { brand } from './brand'
import { usePageTitle } from './useAsync'
import { Mascot } from './Mascot'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  usePageTitle(title)
  return <article className="mx-auto max-w-2xl space-y-4 [&_h2]:mt-6 [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-5"><h1 className="text-3xl sm:text-4xl">{title}</h1>{children}</article>
}

export const About = () => (
  <Doc title="About PikaStudy">
    <Mascot width={160} />
    <p>PikaStudy is a study library for students of Classes 10, 11 and 12. It brings textbooks, notes, question banks, sample papers and previous year papers into one searchable place, organised by class, stream and subject.</p>
    <h2>What we publish</h2>
    <p>We host or link only material that is authorised for distribution, such as official sources and content shared with permission. Books that are not available are listed as requests, not copied.</p>
    <h2>Missing a book?</h2>
    <p><Link className="font-bold underline" to="/request">Send a request</Link> and we’ll look for an official copy.</p>
  </Doc>
)

export const Contact = () => (
  <Doc title="Contact">
    <p>Questions, corrections or content removal requests are welcome.</p>
    {brand.contactEmail
      ? <p>Email: <a className="font-bold underline" href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a></p>
      : <p>For book suggestions use the <Link className="font-bold underline" to="/request">request form</Link>.</p>}
    <p>Rights holders: tell us which item to review and we will act on valid requests promptly.</p>
  </Doc>
)

export const Privacy = () => (
  <Doc title="Privacy Policy">
    <p>This page explains what PikaStudy collects. It is a plain-language summary and should be reviewed against your hosting and analytics setup before launch.</p>
    <h2>What we collect</h2>
    <ul><li>Book requests: the book name, class, subject and any notes you type, plus a generated reference ID.</li>
      <li>Download counts: an anonymous counter per book. No account or IP is stored by the app.</li>
      <li>Administrator login: email and password handled by Supabase Authentication, for administrators only.</li></ul>
    <h2>What we don’t do</h2>
    <p>We do not sell personal data. Do not put personal details in the request notes.</p>
    <h2>Third parties</h2>
    <p>Data is stored with Supabase. Your hosting provider and any advertising or analytics you add may set their own cookies; update this policy if you add them.</p>
  </Doc>
)

export const Terms = () => (
  <Doc title="Terms and Conditions">
    <p>By using PikaStudy you agree to these terms.</p>
    <ul><li>Content is provided for personal study. Do not redistribute it commercially.</li>
      <li>Copyright stays with the original owners. We host or link authorised material only.</li>
      <li>If you hold rights to an item and want it removed, contact us and we will review it.</li>
      <li>The service is provided as is, without guarantees about availability or accuracy.</li></ul>
  </Doc>
)
