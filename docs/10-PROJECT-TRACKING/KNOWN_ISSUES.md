# Known Issues & Open Technical Decisions

## 1. Open Business Decisions (Flagged for Stakeholder Alignment)
- **OD-01 (Automated Telephony Dialing Protocol)**:
  - *Current Design*: Software-level call logging with HTML5 `tel:` protocol triggering OS/softphone dialer.
  - *Open Question*: Does Melayurveda intend to integrate a cloud telephony provider (e.g. Exotel, Knowlarity, Twilio) for click-to-call in Phase 2?
  - *Mitigation*: The call logging API is provider-agnostic and ready to accept telephony webhooks.
- **OD-02 (WhatsApp Business API Provider)**:
  - *Current Design*: Generic webhook intake for WhatsApp leads.
  - *Open Question*: Selected Meta BSP (Gupshup, Wati, or Direct Meta Cloud API)?
  - *Mitigation*: Ingestion layer utilizes adapter pattern.

## 2. Technical Debt & Risks
- **Risk-01 (Database Deadlocks on Concurrent Round-Robin)**:
  - Under extreme concurrent lead intake, high-frequency updates on round-robin pointers can cause row locks.
  - *Mitigation*: Use PostgreSQL `FOR UPDATE SKIP LOCKED` or Redis atomic counter for round-robin sequence generation.
