
export const policies = {
  /* Live copy, carried over from the existing CareerVeda site. No `draft` flag, so
     no "placeholder content" banner. */
  "privacy-policy": {
    eyebrow: "Legal",
    title: "Privacy Policy",
    lead: "Your privacy is important to us. Learn how we protect your data.",
    updated: "20 February 2026",
    stats: [
      {value: "Secure", label: "Data protection"},
      {value: "Transparent", label: "Privacy practices"},
      {value: "Compliant", label: "Data regulations"},
    ],
    sections: [
      {
        id: "introduction",
        heading: "1. Introduction",
        body: [
          "CareerVeda OPC Private Limited (“CareerVeda”, “we”, “us”, or “our”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services. Please read this policy carefully to understand our practices regarding your personal data.",
        ],
      },
      {
        id: "information-we-collect",
        heading: "2. Information we collect",
        body: ["We collect various types of information to provide and improve our services to you:"],
        // Two kinds of data, kept apart: what you hand us, and what the site records
        // as you use it. Running them into one list would blur that distinction,
        // which is the part a reader actually cares about.
        groups: [
          {
            title: "2.1 Personal information",
            list: [
              "Name, email address, and phone number",
              "Educational qualifications and professional background",
              "Date of birth and identity documents",
              "Payment information",
              "Resume and career-related documents",
            ],
          },
          {
            title: "2.2 Technical information",
            list: [
              "IP address, browser type, and device information",
              "Cookies and similar tracking technologies",
              "Log data including access times and pages viewed",
              "Location data (with your consent)",
            ],
          },
        ],
      },
      {
        id: "how-we-use",
        heading: "3. How we use your information",
        body: ["CareerVeda uses the collected information for the following purposes:"],
        list: [
          "To provide, maintain, and improve our educational services and programs",
          "To process your enrollment and manage your account",
          "To communicate with you about courses, updates, and promotional offers",
          "To provide placement assistance and connect you with hiring partners",
          "To personalize your learning experience and recommend relevant programs",
          "To process payments and prevent fraudulent transactions",
          "To analyze usage patterns and improve our website functionality",
          "To comply with legal obligations and enforce our terms of service",
        ],
      },
      {
        id: "sharing",
        heading: "4. Sharing your information",
        body: ["We may share your information with third parties in the following circumstances:"],
        list: [
          "Hiring partners: with your consent, we share your profile with companies for placement opportunities",
          "Service providers: with third-party vendors who assist in delivering our services (payment processors, email services, etc.)",
          "Educational partners: with universities and certification bodies for program delivery and credential verification",
          "Legal requirements: when required by law or to protect our rights and safety",
          "Business transfers: in connection with any merger, acquisition, or sale of company assets",
        ],
      },
      {
        id: "data-security",
        heading: "5. Data security",
        body: [
          "We implement appropriate technical and organizational security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. These measures include:",
        ],
        list: [
          "Encryption of sensitive data during transmission and storage",
          "Regular security assessments and vulnerability testing",
          "Restricted access to personal information on a need-to-know basis",
          "Employee training on data protection and privacy practices",
          "Secure payment processing through trusted payment gateways",
        ],
      },
      {
        id: "your-rights",
        heading: "6. Your rights and choices",
        body: ["You have certain rights regarding your personal information:"],
        list: [
          "Access: request a copy of the personal information we hold about you",
          "Correction: update or correct inaccurate or incomplete information",
          "Deletion: request deletion of your personal information (subject to legal obligations)",
          "Opt-out: unsubscribe from marketing communications at any time",
          "Data portability: request your data in a structured, machine-readable format",
          "Withdraw consent: withdraw consent for data processing where consent was the basis",
        ],
      },
      {
        id: "cookies",
        heading: "7. Cookies and tracking technologies",
        body: [
          "We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small files stored on your device that help us:",
        ],
        list: [
          "Remember your preferences and settings",
          "Understand how you use our website and improve functionality",
          "Provide personalized content and recommendations",
          "Analyze website traffic and user behavior",
        ],
      },
      {
        id: "data-retention",
        heading: "8. Data retention",
        body: [
          "We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. After you complete your program, we may retain certain information for:",
        ],
        list: [
          "Alumni services and ongoing career support",
          "Compliance with legal and regulatory requirements",
          "Resolution of disputes and enforcement of agreements",
          "Legitimate business purposes such as analytics and record-keeping",
        ],
      },
      {
        id: "childrens-privacy",
        heading: "9. Children’s privacy",
        body: [
          "Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately so we can take appropriate action.",
        ],
      },
      {
        id: "international-transfers",
        heading: "10. International data transfers",
        body: [
          "Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. When we transfer your information internationally, we ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.",
        ],
      },
      {
        id: "changes",
        heading: "11. Changes to this Privacy Policy",
        body: [
          "We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated policy on our website and updating the “Last updated” date.",
        ],
      },
      {
        id: "contact",
        heading: "12. Contact us",
        body: [
          "If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:",
        ],
        list: [
          "Email: Info@careerveda.in",
          "Phone: +91 9217801191",
          "Address: CareerVeda OPC Private Limited, Awfis Majestic Signia, Noida, Uttar Pradesh 201309",
        ],
        closing:
          "By using CareerVeda’s services, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.",
      },
    ],
  },

  /* Live copy, carried over from the existing CareerVeda site. No `draft` flag, so
     the page is published and linked from the footer. Terms §4 points here for
     payment terms, which it can now do without dangling. */
  "refund-policy": {
    eyebrow: "Legal",
    title: "Refund Policy",
    lead: "Understand our transparent refund and cancellation terms.",
    effective: "1 January 2024",
    updated: "7 February 2026",
    // The tiles under the title. They are the answers to the questions people
    // actually arrive on this page with — is the process fair, how long does it
    // take — pulled up above twelve sections of terms.
    //
    // No "7-Day / Money back guarantee" tile. The seven-day window is real but it
    // is conditional — §2.1 grants the full refund only before the program starts
    // and before any materials are accessed — and a headline tile is the one place
    // with no room for the conditions. It reads as an unqualified promise, so the
    // terms state it and the tiles do not.
    stats: [
      {value: "Fair", label: "Refund process"},
      {value: "10–15 Days", label: "Processing time"},
    ],
    sections: [
      {
        id: "overview",
        heading: "1. Overview",
        body: [
          "At CareerVeda, we are committed to providing high-quality educational programs and services. We understand that circumstances may change, and this Refund Policy outlines the terms and conditions under which refunds may be requested and processed. Please read this policy carefully before enrolling in any of our programs.",
        ],
      },
      {
        id: "eligibility",
        heading: "2. Refund eligibility",
        body: [
          "Refund eligibility depends on when the cancellation request is made and the circumstances surrounding it:",
        ],
        // Three tiers, kept as separate groups: what a reader wants from this section
        // is which band they fall into, and running the three into one list of bullets
        // would bury exactly that.
        groups: [
          {
            title: "2.1 Full refund (100%)",
            list: [
              "Cancellation within 7 days of enrollment and before the program start date",
              "Cancellation before accessing any course materials or attending any sessions",
              "Program cancellation by CareerVeda due to insufficient enrollment",
              "Technical issues preventing access to the program for more than 15 days",
            ],
          },
          {
            title: "2.2 Partial refund (50%)",
            list: [
              "Cancellation within 30 days of program start date and after attending up to 10% of sessions",
              "Medical emergency or serious personal circumstances (documentation required)",
              "Relocation or job change preventing participation (documentation required)",
            ],
          },
          {
            title: "2.3 No refund",
            list: [
              "Cancellation after 30 days from the program start date",
              "After attending more than 10% of scheduled sessions",
              "Violation of Terms of Use or code of conduct",
              "Failure to meet payment obligations resulting in program suspension",
              "Completion of the program or receipt of certification",
            ],
          },
        ],
      },
      {
        id: "request-process",
        heading: "3. Refund request process",
        body: ["To request a refund, please follow these steps:"],
        list: [
          "Send a written refund request to Info@careerveda.in from your registered email address",
          "Include your full name, enrollment ID, program name, and reason for cancellation",
          "Attach any supporting documents if claiming refund under special circumstances",
          "Our team will review your request within 5–7 business days",
          "You will receive a confirmation email with the refund decision and timeline",
        ],
        callout:
          "Refund requests must be submitted in writing. Verbal requests or phone calls will not be considered for processing.",
      },
      {
        id: "processing-time",
        heading: "4. Refund processing time",
        body: ["Once your refund request is approved, the processing timeline is as follows:"],
        list: [
          "Credit/debit card: 10–15 business days from approval date",
          "Bank transfer: 7–10 business days from approval date",
          "UPI / online wallets: 5–7 business days from approval date",
          "Cheque: 15–20 business days from approval date",
        ],
        closing:
          "Refund processing times may vary depending on your bank or payment provider. CareerVeda is not responsible for delays caused by third-party payment processors or banking institutions.",
      },
      {
        id: "deductions",
        heading: "5. Deductions and processing fees",
        body: ["The following deductions may apply to approved refunds:"],
        list: [
          "Payment gateway charges and transaction fees (2–3% of total amount)",
          "Administrative processing fee of ₹500 for partial refunds",
          "Cost of any course materials or resources already provided",
          "Pro-rata charges for sessions attended before cancellation",
        ],
        closing:
          "These deductions ensure fair compensation for services rendered and administrative costs incurred.",
      },
      {
        id: "emi",
        heading: "6. EMI and installment plans",
        body: ["For students enrolled through EMI or installment payment plans:"],
        list: [
          "Refunds will be processed only for amounts already paid to CareerVeda",
          "You remain responsible for installments due until official cancellation",
          "Interest charges and EMI processing fees are non-refundable",
          "Third-party EMI providers may have their own cancellation policies",
          "Contact both CareerVeda and your EMI provider for complete cancellation",
        ],
      },
      {
        id: "transfer-deferment",
        heading: "7. Program transfer and deferment",
        body: ["As an alternative to a refund, eligible students may opt for:"],
        list: [
          "Program deferment: postpone your enrollment to the next available batch (one-time option within 6 months)",
          "Program transfer: switch to a different CareerVeda program of equal or lesser value",
          "Credit note: receive a credit note for future programs (valid for 12 months)",
        ],
        closing:
          "Transfer and deferment requests are subject to seat availability and must be requested before 50% program completion.",
      },
      {
        id: "special-circumstances",
        heading: "8. Special circumstances",
        body: [
          "CareerVeda may consider refund requests beyond standard policy terms in the following exceptional cases:",
        ],
        list: [
          "Serious medical emergency affecting the student or immediate family (medical certificate required)",
          "Death of the enrolled student (death certificate and legal documentation required)",
          "Natural disasters or force majeure events preventing participation",
          "Significant changes to program curriculum or schedule not communicated in advance",
        ],
        closing:
          "Each special circumstance is reviewed individually by our management team. Documentation and proof must be provided for consideration.",
      },
      {
        id: "non-refundable",
        heading: "9. Non-refundable items",
        body: [
          "The following fees and charges are non-refundable under any circumstances:",
        ],
        list: [
          "Registration and enrollment fees",
          "Examination and certification fees paid to external bodies",
          "Third-party software licenses and access codes",
          "Physical course materials, books, and kits already delivered",
          "One-on-one mentorship sessions already conducted",
          "Career services and placement assistance fees",
        ],
      },
      {
        id: "dispute-resolution",
        heading: "10. Dispute resolution",
        body: ["If you disagree with a refund decision:"],
        list: [
          "Submit a written appeal to our escalation team within 15 days of the decision",
          "Provide additional documentation or clarification to support your case",
          "The escalation team will review and respond within 10 business days",
          "The decision of the escalation team is final and binding",
        ],
        closing:
          "For unresolved disputes, you may refer to our Escalation Policy or seek legal remedies as per applicable laws.",
      },
      {
        id: "policy-updates",
        heading: "11. Policy updates",
        body: [
          "CareerVeda reserves the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting on our website. The policy applicable at the time of your enrollment will govern your refund eligibility. We recommend reviewing this policy periodically for any updates.",
        ],
      },
      {
        id: "contact",
        heading: "12. Contact information",
        body: ["For refund requests or questions about this policy, please contact:"],
        list: [
          "Email: Info@careerveda.in",
          "Phone: +91 9217801191",
          "Address: CareerVeda OPC Private Limited, Awfis Majestic Signia, 1st Floor, Plot No. A-27, Block A, Industrial Area, Sector 62, Noida, Uttar Pradesh 201309",
          "Business hours: Mon–Sat, 10:00 AM to 07:00 PM (Sunday closed)",
        ],
        closing:
          "By enrolling in CareerVeda programs, you acknowledge that you have read, understood, and agree to this Refund Policy. We encourage you to carefully review all terms before making payment.",
      },
    ],
  },

  /* Live copy, carried over from the existing CareerVeda site. The other policies
     on this page are still structural drafts — this one is not, so it does not
     carry the `draft` flag and the "placeholder content" banner does not appear. */
  "terms": {
    eyebrow: "Legal",
    title: "Terms of Use",
    lead: "Please read these terms carefully before using our services.",
    effective: "1 January 2024",
    updated: "21 February 2026",
    stats: [
      {value: "1 Jan 2024", label: "Effective date"},
      {value: "21 Feb 2026", label: "Last updated"},
      {value: "Protected", label: "Your rights"},
    ],
    sections: [
      {
        id: "acceptance",
        heading: "1. Acceptance of terms",
        body: [
          "By accessing and using the CareerVeda website and services, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these Terms of Use, please do not use our website or services.",
        ],
      },
      {
        id: "use-of-services",
        heading: "2. Use of services",
        body: [
          "CareerVeda provides professional training programs, educational content, and career development services. You agree to use our services only for lawful purposes and in accordance with these Terms.",
        ],
        list: [
          "You must be at least 18 years old to register for our programs",
          "You are responsible for maintaining the confidentiality of your account credentials",
          "You agree not to share your account access with others",
          "You will not use our services for any illegal or unauthorized purpose",
        ],
      },
      {
        id: "intellectual-property",
        heading: "3. Intellectual property rights",
        body: [
          "All content, materials, and resources provided through CareerVeda, including but not limited to course materials, videos, presentations, and documentation, are the intellectual property of CareerVeda or its licensors and are protected by copyright, trademark, and other intellectual property laws.",
        ],
        list: [
          "You may not reproduce, distribute, or create derivative works from our content",
          "Course materials are for personal use only and cannot be shared publicly",
          "Recording or sharing of live sessions without permission is prohibited",
        ],
      },
      {
        id: "enrollment-and-payment",
        heading: "4. Program enrollment and payment",
        body: [
          "When you enroll in a CareerVeda program, you agree to pay all applicable fees as per the program terms. Payment terms and refund policies are outlined separately in our Refund Policy.",
        ],
        list: [
          "All fees must be paid in full or as per the agreed payment schedule",
          "Failure to pay may result in suspension of access to course materials",
          "Prices are subject to change, but enrolled students pay the agreed price",
        ],
      },
      {
        id: "user-conduct",
        heading: "5. User conduct",
        body: [
          "You agree to conduct yourself professionally and respectfully when interacting with CareerVeda staff, instructors, and other students. Harassment, discrimination, or inappropriate behavior will not be tolerated.",
        ],
        list: [
          "Maintain respectful communication in all interactions",
          "Do not spam, advertise, or promote external services without permission",
          "Do not engage in any activity that disrupts the learning experience",
          "Report any violations or concerns to CareerVeda management",
        ],
      },
      {
        id: "disclaimers",
        heading: "6. Disclaimers and limitation of liability",
        callout:
          "Important legal disclaimer: CareerVeda is an independent education services platform. We are not associated, affiliated, or endorsed by any other training provider or institution.",
        body: [
          "While CareerVeda strives to provide high-quality education and career services, we make no guarantees regarding specific outcomes, job placements, or salary increases. Our services are provided “as is” without warranties of any kind.",
        ],
        list: [
          "Career success depends on individual effort, market conditions, and other factors",
          "We are not liable for any indirect, incidental, or consequential damages",
          "Our total liability is limited to the amount paid for the specific program",
        ],
      },
      {
        id: "placement-assistance",
        heading: "7. Placement assistance",
        body: [
          "CareerVeda provides placement assistance to eligible students who successfully complete their programs. However, placement is not guaranteed and depends on various factors including market conditions, student performance, and individual qualifications.",
        ],
      },
      {
        id: "modifications",
        heading: "8. Modifications to terms",
        body: [
          "CareerVeda reserves the right to modify these Terms of Use at any time. We will notify users of significant changes via email or website notifications. Continued use of our services after changes constitutes acceptance of the modified terms.",
        ],
      },
      {
        id: "termination",
        heading: "9. Termination",
        body: [
          "CareerVeda reserves the right to terminate or suspend your access to our services at any time for violation of these Terms or for any other reason deemed necessary for the protection of our business or other users.",
        ],
      },
      {
        id: "governing-law",
        heading: "10. Governing law",
        body: [
          "These Terms of Use shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Noida, Uttar Pradesh.",
        ],
      },
      {
        id: "contact",
        heading: "11. Contact information",
        body: [
          "If you have any questions about these Terms of Use, please contact us at:",
        ],
        list: [
          "Email: Info@careerveda.in",
          "Phone: +91 9217801191",
          "Address: CareerVeda OPC Private Limited, Awfis Majestic Signia, 1st Floor, Plot No. A-27, Block A, Industrial Area, Sector 62, Noida, Uttar Pradesh 201309",
        ],
        closing:
          "By using CareerVeda’s services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.",
      },
    ],
  },

  /* Published: the placeholders are gone and `draft` with them, so the footer link
     and the /escalation-policy route now resolve. Initial response 24–48 hours,
     three escalation levels, resolution timelines per level — all below. */
  "escalation-policy": {
    eyebrow: "Legal",
    title: "Escalation Policy",
    lead: "We're committed to resolving your concerns promptly and effectively.",
    effective: "1 January 2024",
    updated: "20 February 2026",
    sections: [
      {
        id: "purpose",
        heading: "1. Purpose and Scope",
        body: [
          "CareerVeda is committed to providing exceptional service and support to all our students. This Escalation Policy outlines the structured process for addressing and resolving complaints, grievances, and concerns that may arise during your learning journey with us. We believe in transparent communication and prompt resolution of issues at every level of our organization.",
          "This policy applies to all students, alumni, and stakeholders interacting with CareerVeda's programs, services, and personnel. We encourage you to communicate your concerns so we can address them effectively and improve our services continuously.",
        ],
      },
      {
        id: "issues-covered",
        heading: "2. Types of Issues Covered",
        body: [
          "This escalation policy covers a wide range of concerns including but not limited to:",
        ],
        list: [
          "Course content quality, delivery, or access issues",
          "Instructor performance, availability, or conduct concerns",
          "Technical difficulties with learning platforms or materials",
          "Billing, payment, or refund disputes",
          "Placement assistance and career services concerns",
          "Certification and credential-related issues",
          "Harassment, discrimination, or inappropriate behaviour",
          "Administrative delays or communication gaps",
          "Breach of terms and conditions or policy violations",
        ],
      },
      {
        id: "escalation-matrix",
        heading: "3. Escalation Matrix",
        body: [
          "Our three-tiered escalation process ensures that your concerns are addressed at the appropriate level.",
          "Level 1 is your first point of contact for most issues. The support team is equipped to handle routine queries, technical problems, content access issues, and general concerns. They work directly with instructors and technical teams to resolve matters quickly.",
          "If your issue remains unresolved after Level 1, or if it requires management intervention, escalate to Level 2. The Program Manager reviews your case comprehensively, investigates thoroughly, and coordinates with relevant departments to provide a solution.",
          "Level 3 represents the highest escalation point within CareerVeda. Senior management reviews cases that remain unresolved at Level 2, involve policy violations, require executive decisions, or concern serious grievances.",
        ],
        groups: [
          {
            title: "Level 1 — Program Coordinator / Support Team",
            list: [
              "Contact: your assigned Program Coordinator or the Support Team",
              "Email: Info@careerveda.in",
              "Phone: +91 9217801191",
              "Response time: 24–48 hours",
              "Resolution time: 3–5 business days",
            ],
          },
          {
            title: "Level 2 — Program Manager / Department Head",
            list: [
              "Contact: Program Manager or Department Head",
              "Email: Info@careerveda.in, subject “Escalation - Level 2”",
              "Response time: 48–72 hours",
              "Resolution time: 7–10 business days",
            ],
          },
          {
            title: "Level 3 — Senior Management / Director",
            list: [
              "Contact: Senior Management Team",
              "Email: Info@careerveda.in, subject “Escalation - Level 3”",
              "Response time: 3–5 business days",
              "Resolution time: 10–15 business days",
            ],
          },
        ],
      },
      {
        id: "how-to-raise",
        heading: "4. How to Raise an Escalation",
        body: [
          "To ensure your concern is addressed efficiently, follow these steps:",
        ],
        groups: [
          {
            title: "Step 1 — Document your concern",
            list: [
              "Clearly describe your issue with specific details, dates, and circumstances",
              "Include your enrolment ID, program name, and contact information",
              "Attach relevant screenshots or supporting documents",
            ],
          },
          {
            title: "Step 2 — Submit your complaint",
            list: [
              "Send a written complaint by email to the contact for the appropriate level",
              "Use a clear subject line: “Complaint - [Brief description] - [Your Name]”",
              "You will receive an acknowledgement with a ticket number within 24 hours",
            ],
          },
          {
            title: "Step 3 — Track and follow up",
            list: [
              "Save your ticket number for reference",
              "You will receive regular updates on your case",
              "If you do not receive a response within the stated timeframe, you may escalate to the next level",
            ],
          },
        ],
      },
      {
        id: "timeline",
        heading: "5. Response and Resolution Timeline",
        body: [
          "We are committed to addressing your concerns within specific timeframes:",
        ],
        list: [
          "Acknowledgement — within 24 hours of receiving your complaint",
          "Initial assessment — 24–48 hours to review and assign to the appropriate team",
          "Investigation — 3–10 business days, depending on complexity and level",
          "Resolution and closure — a final response with the resolution or an explanation",
        ],
        closing:
          "Please note that complex cases may require additional time. We will keep you informed if an extended investigation is needed.",
      },
      {
        id: "escalation-criteria",
        heading: "6. Escalation Criteria",
        body: ["You may escalate your concern to the next level if:"],
        list: [
          "You do not receive a response within the committed timeframe",
          "The resolution provided is unsatisfactory or inadequate",
          "The issue has not been resolved despite multiple follow-ups",
          "New information or circumstances have emerged",
          "The matter involves serious policy violations or misconduct",
        ],
      },
      {
        id: "confidentiality",
        heading: "7. Confidentiality and Non-Retaliation",
        body: [
          "CareerVeda is committed to maintaining confidentiality and protecting individuals who raise concerns:",
        ],
        list: [
          "Confidentiality — all complaints are handled with strict confidentiality, shared only with the personnel involved in resolution",
          "No retaliation — students will not face adverse consequences for raising legitimate concerns in good faith",
          "Anonymous reporting — we accept anonymous complaints for serious violations, though resolution may be limited without contact information",
          "Protected information — personal details of complainants are protected in accordance with our Privacy Policy",
        ],
      },
      {
        id: "expected-conduct",
        heading: "8. Expected Conduct",
        body: ["We expect all parties involved in the escalation process to:"],
        list: [
          "Communicate respectfully and professionally at all times",
          "Provide accurate and complete information",
          "Cooperate with investigation and resolution efforts",
          "Use the escalation process in good faith, not for frivolous or malicious purposes",
          "Allow reasonable time for investigation and resolution",
        ],
      },
      {
        id: "external-remedies",
        heading: "9. External Remedies",
        body: [
          "If you remain dissatisfied after exhausting all internal escalation levels, you may seek external remedies:",
        ],
        list: [
          "Consumer forums and grievance redressal mechanisms as per Indian law",
          "Regulatory bodies overseeing educational institutions and services",
          "Legal recourse through the appropriate courts as per jurisdiction",
          "Mediation or arbitration services for dispute resolution",
        ],
        closing:
          "We encourage resolving matters through our internal process before pursuing external options.",
      },
      {
        id: "continuous-improvement",
        heading: "10. Continuous Improvement",
        body: [
          "CareerVeda values feedback and uses escalation data to improve our services:",
        ],
        list: [
          "All complaints are analysed for patterns and root causes",
          "Recurring issues are addressed through process improvements",
          "Feedback is shared with relevant teams for quality enhancement",
        ],
      },
      {
        id: "contact",
        heading: "11. Contact Information",
        body: ["For escalations and complaints, please contact:"],
        list: [
          "Level 1 — Support Team: Info@careerveda.in, +91 9217801191",
          "Level 2 — Management: Info@careerveda.in, subject “Escalation - Level 2”",
          "Level 3 — Senior Leadership: Info@careerveda.in, subject “Escalation - Level 3”",
          "Mailing address: CareerVeda OPC Private Limited, Awfis Majestic Signia, 1st Floor, Plot No. A-27, Block A, Industrial Area, Sector 62, Noida, Uttar Pradesh 201309",
        ],
        closing:
          "We appreciate your trust in CareerVeda and are committed to addressing your concerns with the utmost care and urgency. Your feedback helps us serve you better.",
      },
    ],
  },
};

export const policyRoutes = Object.keys(policies);

/* The policies that may face the public: slug + title, in the order they are
   declared above. The footer renders from this, so a policy is linked exactly when
   it is publishable — there is no second list to keep in step, and a draft cannot
   be linked to by being forgotten. */
export const publishedPolicies = Object.entries(policies)
  .filter(([, policy]) => !policy.draft)
  .map(([slug, policy]) => ({slug, title: policy.title}));
