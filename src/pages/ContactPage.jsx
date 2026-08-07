import {PageHero, SectionHeading} from "../components/PageShell";
import {Reveal, StaggerGroup, StaggerItem} from "../components/motionPrimitives";

const contactLines = [
  ["📍", "Visit us", "CareerVeda OPC Private Limited, Awfis Majestic Signia, 1st Floor, Plot No. A-27, Block A, Industrial Area, Sector 62, Noida, Uttar Pradesh 201309"],
  ["📞", "Call us", "+91 92178 01191"],
  ["✉️", "Email us", "Info@careerveda.in"],
  ["🕒", "Working hours", "Mon–Sat: 10:00 AM to 07:00 PM · Sunday: Closed"],
];

const ContactPage = () => {
  return (
    <main className="spline-page page-shell">
      <PageHero
        eyebrow="Contact CareerVeda"
        title={<>Let's talk about your <span className="accent">next career move</span></>}
        lead="Have a question about a program, admissions, or placement support? Reach out and a career expert will get back to you"
      />

      <section className="page-section">
        <div className="ps-inner">
          <div className="page-split">
            <StaggerGroup>
              <SectionHeading label="Reach us" title="We'd love to hear from you" />
              {contactLines.map(([ic, title, body]) => (
                <StaggerItem className="contact-line" key={title}>
                  <span className="ic" aria-hidden="true">{ic}</span>
                  <span>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </span>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <Reveal as="form" className="page-form" amount={0.15}>
              <h3>Send us a message</h3>
              <div className="form-grid">
                <label className="form-field">
                  Full name*
                  <input type="text" name="name" placeholder="Your full name" />
                </label>
                <label className="form-field">
                  Email*
                  <input type="email" name="email" placeholder="you@example.com" />
                </label>
                <label className="form-field">
                  Mobile no.*
                  <input type="tel" name="mobile" placeholder="+91 92178 01191" />
                </label>
                <label className="form-field">
                  Topic
                  <select name="topic" defaultValue="Admissions">
                    <option>Admissions</option>
                    <option>Program details</option>
                    <option>Placement support</option>
                    <option>Partnerships</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="form-field full">
                  Message
                  <textarea name="message" placeholder="How can we help?" />
                </label>
              </div>
              <div className="page-hero__actions">
                <button type="button" className="page-btn page-btn--primary">Send message</button>
              </div>
              {/* TODO: Wire this form to your backend / form service (no submission handler yet). */}
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
