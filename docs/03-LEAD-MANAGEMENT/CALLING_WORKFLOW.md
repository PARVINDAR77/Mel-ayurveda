# Calling Management Workflow Specification

## 1. Overview
Tele-calling is the central interaction point between Melayurveda health consultants and potential customers. Every conversation must be cataloged with an explicit business outcome and consultation notes.

## 2. Call Outcomes & Business Rules
| Outcome Code | Meaning | Required Fields | Next Lead State |
|:---|:---|:---|:---|
| `INTERESTED` | Customer actively wants Ayurvedic regimen. | Product Interest, Notes | `INTERESTED` |
| `NOT_INTERESTED` | Customer explicitly declined treatment. | Detailed Reason, Notes | `NOT_INTERESTED` |
| `NO_ANSWER` | Phone rang out; no pickup. | Attempt count | `CONTACTED` |
| `BUSY_CALL_LATER` | Customer requested callback. | Mandatory Follow-up Date/Time | `FOLLOW_UP_REQUIRED` |
| `INVALID_NUMBER` | Number disconnected or wrong person. | Disconnect reason | `INVALID_NUMBER` |
| `FOLLOW_UP_REQUIRED`| In-depth consultation required later. | Mandatory Follow-up Date/Time | `FOLLOW_UP_REQUIRED` |
| `PENDING_REVIEW` | Disputed inquiry or clinical review required. | Review reason, Medical summary | `PENDING_REVIEW` |
| `REJECTED` | Inappropriate caller / Abusive / Ineligible. | Rejection rationale | `REJECTED` |

## 3. Immutability & Audit Guarantee
- Call logs are strictly **APPEND-ONLY**.
- Neither sales representatives nor administrators can edit or delete an existing call log entry.
- All entries record: `caller_id`, `lead_id`, `call_outcome`, `notes`, `duration_seconds`, `call_timestamp`.
