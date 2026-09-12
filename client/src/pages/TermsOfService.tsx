import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

function TH_ADDRESS({
  email,
  linkStyle,
}: {
  email: string;
  linkStyle: React.CSSProperties;
}) {
  return (
    <>
      Michael Kiattanabumroong
      <br />
      BotflowLab.com
      <br />
      88/14 Phuttomonthon Sai 2 Soi 31
      <br />
      Sala Thammasop, Thawi Wattana
      <br />
      Bangkok 10170
      <br />
      Thailand
      <br />
      +66 6-3094-9914
      <br />
      <a href={`mailto:${email}`} style={linkStyle} className="break-all">
        {email}
      </a>
    </>
  );
}

function US_ADDRESS({
  email,
  linkStyle,
}: {
  email: string;
  linkStyle: React.CSSProperties;
}) {
  return (
    <>
      Stephen Kinzey
      <br />
      SK America LLC
      <br />
      255 N D St, Suite 200XIX
      <br />
      San Bernardino, CA 92401
      <br />
      United States
      <br />
      909 644-9828
      <br />
      <a href={`mailto:${email}`} style={linkStyle} className="break-all">
        {email}
      </a>
    </>
  );
}

const SH = "text-base font-bold mb-3";
const SHS = {
  fontFamily: "'Poppins', sans-serif",
  color: "oklch(0.90 0.02 260)",
};
const BODY = { color: "oklch(0.78 0.02 260)" };
const LINK = { color: "oklch(0.80 0.18 80)" };
const BORDER = { borderColor: "oklch(0.80 0.18 80)" };

export default function TermsOfService() {
  const [, navigate] = useLocation();
  const [isThai, setIsThai] = useState(false);
  useEffect(() => {
    setIsThai(localStorage.getItem("rr-lang") === "th");
  }, []);
  const CONTACT_EMAIL = isThai
    ? "michael@botflowlab.com"
    : "steve@sk-america.com";
  const ADDR = isThai ? (
    <TH_ADDRESS email={CONTACT_EMAIL} linkStyle={LINK} />
  ) : (
    <US_ADDRESS email={CONTACT_EMAIL} linkStyle={LINK} />
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="container py-10">
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 260)" }}>
          Last updated: April 13, 2026
        </p>
      </div>

      {/* Content */}
      <div
        className="container pb-16 max-w-3xl space-y-7 text-sm leading-relaxed"
        style={BODY}
      >
        {/* 1. Acceptance */}
        <section>
          <h2 className={SH} style={SHS}>
            1. Acceptance of Terms
          </h2>
          <p className="mb-3">
            By creating an account or otherwise accessing or using the Get Phame
            web application (the "Service"), you agree to be legally bound by
            these Terms of Service ("Terms") and our Privacy Policy, which is
            incorporated herein by reference. If you are using the Service on
            behalf of a business or other legal entity, you represent that you
            have authority to bind that entity to these Terms, and "you" refers
            to that entity.
          </p>
          <p>
            If you do not agree to these Terms in their entirety, you must not
            access or use the Service. We reserve the right to update these
            Terms at any time. Material changes will be communicated by updating
            the "Last updated" date above. Your continued use of the Service
            after any change constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* 2. Description */}
        <section>
          <h2 className={SH} style={SHS}>
            2. Description of Service
          </h2>
          <p className="mb-3">
            Get Phame is a software-as-a-service (SaaS) web application that
            enables small business owners to send personalised review request
            emails to their customers using their own connected email account
            (via SMTP). The Service provides tools for managing customer
            contacts, creating email templates, scheduling follow-up reminders,
            and viewing delivery analytics (open and click tracking).
          </p>
          <p>
            The Service is currently provided free of charge with no artificial
            sending limits. We reserve the right to introduce optional paid
            features or premium tiers in the future. Any such changes will be
            clearly disclosed in advance, and no charge will be incurred without
            your explicit consent. Your continued free access will not be
            retroactively restricted without reasonable notice.
          </p>
        </section>

        {/* 3. Eligibility */}
        <section>
          <h2 className={SH} style={SHS}>
            3. Eligibility and Account Registration
          </h2>
          <p className="mb-3">
            You must be at least 18 years of age and capable of forming a
            binding contract to use the Service. The Service is intended for
            business use and is not directed at consumers acting in a personal
            capacity.
          </p>
          <p className="mb-3">
            You must sign in using a valid Google account to access the Service.
            You are responsible for maintaining the confidentiality of your
            session and for all activity that occurs under your account. You
            agree to notify us immediately at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>
              {CONTACT_EMAIL}
            </a>{" "}
            if you become aware of any unauthorised use of your account.
          </p>
          <p>
            We reserve the right to refuse registration or terminate accounts at
            our sole discretion, including where we believe the account is being
            used in violation of these Terms or applicable law.
          </p>
        </section>

        {/* 4. Acceptable Use */}
        <section>
          <h2 className={SH} style={SHS}>
            4. Acceptable Use Policy
          </h2>
          <p className="mb-3">
            You may use the Service only for lawful purposes and in accordance
            with these Terms. The following conduct is expressly prohibited:
          </p>

          <h3 className="font-bold mb-2 mt-3" style={SHS}>
            4.1 Prohibited Email Practices
          </h3>
          <p className="mb-2">
            You must not use the Service to send unsolicited commercial email
            (spam) to any person who has not had a genuine, prior business
            relationship with you. You must not use purchased, rented, scraped,
            or otherwise third-party-sourced email lists. You must not send
            emails to individuals who have previously opted out, unsubscribed,
            or asked not to be contacted. You must not send emails in volumes or
            frequencies that constitute harassment.
          </p>

          <h3 className="font-bold mb-2 mt-3" style={SHS}>
            4.2 Prohibited Technical Conduct
          </h3>
          <p className="mb-2">
            You must not attempt to gain unauthorised access to any part of the
            Service, its servers, databases, or related systems. You must not
            use automated scripts, bots, or other tools to circumvent the
            Service's rate limits or to send emails at volumes exceeding what
            you could reasonably send manually. You must not probe, scan, or
            test the vulnerability of any system or network associated with the
            Service. You must not introduce malicious code, viruses, or other
            harmful components into the Service.
          </p>

          <h3 className="font-bold mb-2 mt-3" style={SHS}>
            4.3 Prohibited Content and Conduct
          </h3>
          <p className="mb-2">
            You must not use the Service to harass, threaten, defame, or deceive
            any person. You must not impersonate any person or entity or
            misrepresent your affiliation with any person or entity. You must
            not use the Service to send content that is illegal, fraudulent,
            obscene, or that infringes the intellectual property rights of any
            third party. You must not use the Service in any manner that could
            damage, disable, overburden, or impair the Service or interfere with
            any other party's use of the Service.
          </p>

          <p className="mt-3">
            Violation of this Acceptable Use Policy may result in immediate
            suspension or termination of your account, and may be reported to
            relevant law enforcement authorities where required by law.
          </p>
        </section>

        {/* 5. CAN-SPAM */}
        <section>
          <h2 className={SH} style={SHS}>
            5. CAN-SPAM, GDPR, CASL, and Anti-Spam Compliance
          </h2>
          <p className="mb-3">
            Get Phame provides infrastructure for sending emails — you are the
            sender of record for every email transmitted through your connected
            email account. You acknowledge and agree that you are solely
            responsible for ensuring your use of the Service complies with the
            CAN-SPAM Act (US), the General Data Protection Regulation (EU/UK),
            the Canada Anti-Spam Legislation (CASL), and any other anti-spam,
            data protection, or electronic communications laws applicable in
            your jurisdiction and in the jurisdictions of your recipients.
          </p>
          <p className="mb-3">
            Specifically, you agree that: (a) you will only send review request
            emails to customers with whom you have a genuine, existing business
            relationship; (b) you will not use purchased, rented, or scraped
            email lists; (c) you will honour all unsubscribe or opt-out requests
            promptly and will not send further messages to any person who has
            opted out; (d) you will ensure that any email templates you
            customise include accurate sender identification and, where required
            by law, your physical postal address; and (e) you will obtain any
            consents required by applicable law before sending emails to
            recipients in jurisdictions where prior consent is required (e.g.,
            CASL, GDPR).
          </p>
          <p>
            Get Phame is not liable for any fines, penalties, regulatory
            actions, or damages arising from your failure to comply with
            applicable email laws. You agree to indemnify and hold Get Phame
            harmless from any claims, losses, or expenses (including reasonable
            legal fees) arising from your violation of applicable anti-spam or
            data protection laws.
          </p>
        </section>

        {/* 6. Email Integration */}
        <section>
          <h2 className={SH} style={SHS}>
            6. Email Account Integration
          </h2>
          <p className="mb-3">
            By connecting your email account via SMTP, you authorise Get Phame
            to send emails on your behalf using the credentials you provide. You
            represent that you are authorised to use the email account you
            connect and that doing so does not violate any terms of service of
            your email provider.
          </p>
          <p className="mb-3">
            Your SMTP password is encrypted using AES-256-GCM before storage and
            is never transmitted to any third party. You may disconnect your
            email account at any time from the Settings screen, which
            permanently removes your stored credentials from our systems.
          </p>
          <p>
            Get Phame performs periodic automated health checks on your
            connected email account to verify that it remains reachable. You
            acknowledge that these checks involve a test connection to your mail
            server using your stored credentials. You may disable health checks
            by disconnecting your account.
          </p>
        </section>

        {/* 7. Customer Data */}
        <section>
          <h2 className={SH} style={SHS}>
            7. Customer Data and Data Processing
          </h2>
          <p className="mb-3">
            You are the data controller for all customer contact information
            (names, email addresses) that you upload to or generate within the
            Service. Get Phame acts as a data processor on your behalf with
            respect to that customer data, processing it solely to provide the
            Service in accordance with your instructions.
          </p>
          <p className="mb-3">
            You represent and warrant that: (a) you have the legal right to
            upload and use the customer data you provide; (b) your collection
            and use of that data complies with all applicable data protection
            laws; and (c) where required, you have obtained appropriate consents
            from your customers for the processing of their data.
          </p>
          <p>
            You may delete individual customer records at any time from the
            Contacts screen. You may request deletion of all your data by using
            the account deletion feature in Settings or by contacting us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>
              {CONTACT_EMAIL}
            </a>
            . We will process deletion requests within 30 days.
          </p>
        </section>

        {/* 8. Intellectual Property */}
        <section>
          <h2 className={SH} style={SHS}>
            8. Intellectual Property
          </h2>
          <p className="mb-3">
            The Service, including its software, design, text, graphics, logos,
            and all other content created by Get Phame, is owned by or licensed
            to Get Phame and is protected by United States and international
            copyright, trademark, patent, trade secret, and other intellectual
            property laws. Nothing in these Terms grants you any right, title,
            or interest in the Service or its content beyond the limited licence
            to use the Service as described herein.
          </p>
          <p className="mb-3">
            You retain all ownership rights in the content you create using the
            Service, including email templates you write and customer data you
            upload. By using the Service, you grant Get Phame a limited,
            non-exclusive, royalty-free licence to store, process, and transmit
            your content solely as necessary to provide the Service.
          </p>
          <p>
            You must not copy, modify, create derivative works from, distribute,
            sell, lease, sublicense, or otherwise exploit any part of the
            Service without our prior written consent. You must not remove or
            alter any copyright, trademark, or other proprietary notices from
            any part of the Service.
          </p>
        </section>

        {/* 9. DMCA */}
        <section>
          <h2 className={SH} style={SHS}>
            9. Digital Millennium Copyright Act (DMCA)
          </h2>
          <p className="mb-3">
            Get Phame respects the intellectual property rights of others and
            expects users to do the same. If you believe that content accessible
            through the Service infringes your copyright, you may submit a DMCA
            takedown notice to our designated agent. Your notice must include:
            (a) a physical or electronic signature of the copyright owner or
            authorised agent; (b) identification of the copyrighted work claimed
            to have been infringed; (c) identification of the allegedly
            infringing material and its location on the Service; (d) your
            contact information; (e) a statement that you have a good faith
            belief that the use is not authorised by the copyright owner; and
            (f) a statement, under penalty of perjury, that the information in
            the notice is accurate and that you are authorised to act on behalf
            of the copyright owner.
          </p>
          <p className="mb-3">
            DMCA notices should be sent to:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            If you believe that content you submitted was removed in error, you
            may submit a counter-notification. Repeated infringement of
            third-party intellectual property rights may result in termination
            of your account.
          </p>
        </section>

        {/* 10. Disclaimers */}
        <section>
          <h2 className={SH} style={SHS}>
            10. Disclaimer of Warranties
          </h2>
          <p className="mb-3">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE. REVIEWLINK DOES NOT
            WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE,
            OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>
          <p className="mb-3">
            We make no guarantees regarding: (a) the deliverability of emails
            sent through the Service; (b) the number of reviews you will receive
            as a result of using the Service; (c) the accuracy or completeness
            of any analytics data; or (d) the continued availability of any
            third-party review platforms (Google, Yelp, TripAdvisor, etc.) to
            which you link.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of implied warranties.
            In such jurisdictions, the above exclusions apply to the fullest
            extent permitted by applicable law.
          </p>
        </section>

        {/* 11. Limitation of Liability */}
        <section>
          <h2 className={SH} style={SHS}>
            11. Limitation of Liability
          </h2>
          <p className="mb-3">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, REVIEWLINK AND
            ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF
            PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, OR
            COST OF SUBSTITUTE SERVICES, ARISING OUT OF OR IN CONNECTION WITH
            THESE TERMS OR YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF
            REVIEWLINK HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="mb-3">
            <strong>Liability cap.</strong> In no event shall Get Phame's total
            aggregate liability to you for all claims arising out of or relating
            to these Terms or the Service exceed the greater of: (a) the total
            amount you paid to Get Phame in the twelve (12) months immediately
            preceding the event giving rise to the claim; or (b) one hundred US
            dollars (USD $100.00). This limitation applies regardless of the
            form of action, whether in contract, tort (including negligence),
            strict liability, or otherwise.
          </p>
          <p>
            Some jurisdictions do not allow the limitation or exclusion of
            liability for incidental or consequential damages. In such
            jurisdictions, the above limitations apply to the fullest extent
            permitted by applicable law.
          </p>
        </section>

        {/* 12. Indemnification */}
        <section>
          <h2 className={SH} style={SHS}>
            12. Indemnification
          </h2>
          <p>
            You agree to defend, indemnify, and hold harmless Get Phame and its
            officers, directors, employees, agents, and licensors from and
            against any and all claims, damages, losses, liabilities, costs, and
            expenses (including reasonable attorneys' fees) arising out of or
            relating to: (a) your use of the Service; (b) your violation of
            these Terms; (c) your violation of any applicable law or regulation,
            including anti-spam laws; (d) your infringement of any third-party
            intellectual property or privacy rights; or (e) any content you
            submit, post, or transmit through the Service.
          </p>
        </section>

        {/* 13. Termination */}
        <section>
          <h2 className={SH} style={SHS}>
            13. Termination
          </h2>
          <p className="mb-3">
            You may terminate your account at any time by using the account
            deletion feature in the Settings screen or by contacting us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>
              {CONTACT_EMAIL}
            </a>
            . Upon deletion, your account data will be removed from our active
            systems within 30 days, subject to any retention obligations under
            applicable law.
          </p>
          <p>
            We reserve the right to suspend or terminate your account
            immediately, with or without notice, for any violation of these
            Terms, including but not limited to sending spam, violating
            anti-spam laws, or engaging in conduct that we determine, in our
            sole discretion, is harmful to the Service, other users, or third
            parties. Upon termination, your licence to use the Service ceases
            immediately. Sections 5, 7, 8, 10, 11, 12, 14, and 15 of these Terms
            survive termination.
          </p>
        </section>

        {/* 14. Dispute Resolution */}
        <section>
          <h2 className={SH} style={SHS}>
            14. Dispute Resolution and Arbitration
          </h2>
          <p className="mb-3">
            <strong>Informal resolution.</strong> Before initiating any formal
            dispute process, you agree to contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>
              {CONTACT_EMAIL}
            </a>{" "}
            and give us at least 30 days to attempt to resolve the dispute
            informally. Most concerns can be resolved quickly this way.
          </p>
          {isThai ? (
            <>
              <p className="mb-3">
                <strong>Dispute resolution.</strong> If informal resolution
                fails, disputes shall be submitted to the Thai Arbitration
                Institute (TAI) under its Arbitration Rules, conducted in
                Bangkok, Thailand. The arbitration may be conducted in the Thai
                language, or bilingually in Thai and English by mutual
                agreement. The arbitrator's decision shall be final and binding.
              </p>
              <p className="mb-3">
                <strong>Class action waiver.</strong> YOU AND REVIEWLINK AGREE
                THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN
                INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN
                ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION OR
                PROCEEDING.
              </p>
              <p>
                <strong>Exceptions.</strong> Either party may seek emergency
                injunctive or other equitable relief from a court of competent
                jurisdiction in Bangkok, Thailand to prevent actual or
                threatened infringement, misappropriation, or violation of
                intellectual property rights or confidential information.
              </p>
            </>
          ) : (
            <>
              <p className="mb-3">
                <strong>Binding arbitration.</strong> If informal resolution
                fails, any dispute, claim, or controversy arising out of or
                relating to these Terms or the Service — including questions
                about their existence, validity, interpretation, breach, or
                termination — shall be resolved by binding individual
                arbitration administered by JAMS under its Streamlined
                Arbitration Rules and Procedures, except as otherwise provided
                herein. The arbitration shall be conducted in San Bernardino
                County, California, or remotely by video conference. The
                arbitrator's decision shall be final and binding and may be
                entered as a judgment in any court of competent jurisdiction.
              </p>
              <p className="mb-3">
                <strong>Class action waiver.</strong> YOU AND REVIEWLINK AGREE
                THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN
                INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN
                ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION OR
                PROCEEDING. The arbitrator may not consolidate more than one
                person's claims and may not preside over any form of class or
                representative proceeding.
              </p>
              <p className="mb-3">
                <strong>Exceptions.</strong> Either party may seek emergency
                injunctive or other equitable relief from a court of competent
                jurisdiction to prevent actual or threatened infringement,
                misappropriation, or violation of intellectual property rights
                or confidential information. Small claims court actions that
                qualify may be brought in San Bernardino County, California.
              </p>
              <p>
                <strong>Opt-out.</strong> You may opt out of binding arbitration
                within 30 days of first accepting these Terms by sending written
                notice to{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={LINK}>
                  {CONTACT_EMAIL}
                </a>{" "}
                with the subject line "Arbitration Opt-Out." If you opt out,
                disputes shall be resolved exclusively in the state or federal
                courts located in San Bernardino County, California, and you
                consent to personal jurisdiction in those courts.
              </p>
            </>
          )}
        </section>

        {/* 15. Governing Law */}
        <section>
          <h2 className={SH} style={SHS}>
            15. Governing Law
          </h2>
          {isThai ? (
            <p>
              These Terms and any dispute arising out of or related to them or
              the Service shall be governed by and construed in accordance with
              the laws of Thailand. Subject to the arbitration clause above, you
              consent to the exclusive jurisdiction of the courts of Bangkok,
              Thailand for any disputes not subject to arbitration.
            </p>
          ) : (
            <p>
              These Terms and any dispute arising out of or related to them or
              the Service shall be governed by and construed in accordance with
              the laws of the State of California, United States, without regard
              to its conflict of law principles. Subject to the arbitration
              clause above, you consent to the exclusive jurisdiction of the
              state and federal courts located in San Bernardino County,
              California for any disputes not subject to arbitration.
            </p>
          )}
        </section>

        {/* 16. General */}
        <section>
          <h2 className={SH} style={SHS}>
            16. General Provisions
          </h2>
          <p className="mb-2">
            <strong>Entire agreement.</strong> These Terms, together with the
            Privacy Policy, constitute the entire agreement between you and Get
            Phame with respect to the Service and supersede all prior
            agreements, representations, and understandings.
          </p>
          <p className="mb-2">
            <strong>Severability.</strong> If any provision of these Terms is
            found to be unenforceable or invalid, that provision will be limited
            or eliminated to the minimum extent necessary, and the remaining
            provisions will continue in full force and effect.
          </p>
          <p className="mb-2">
            <strong>Waiver.</strong> Our failure to enforce any right or
            provision of these Terms will not be considered a waiver of those
            rights.
          </p>
          <p className="mb-2">
            <strong>Assignment.</strong> You may not assign or transfer these
            Terms or your rights hereunder without our prior written consent. We
            may assign these Terms without restriction.
          </p>
          <p>
            <strong>Force majeure.</strong> Get Phame shall not be liable for
            any failure or delay in performance resulting from causes beyond our
            reasonable control, including acts of God, natural disasters, war,
            terrorism, labour disputes, internet outages, or actions of
            third-party service providers.
          </p>
        </section>

        {/* 17. Contact */}
        <section>
          <h2 className={SH} style={SHS}>
            17. Contact Us
          </h2>
          <p className="mb-3">
            If you have questions about these Terms or wish to report a
            violation, please contact our legal team:
          </p>
          <address
            className="not-italic leading-relaxed pl-3 border-l-2"
            style={BORDER}
          >
            <span translate="no">
              Get Phame — Legal
              <br />
              {ADDR}
            </span>
          </address>
        </section>
      </div>
    </div>
  );
}
