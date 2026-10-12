# Meow World V1 — Concept Capture (2026-10-12 Afternoon)

> **Status: CAPTURED CONCEPTS — PENDING RECONCILIATION**
>
> This document preserves ideas discussed during the afternoon conversation. It is a working capture, not a final specification, architecture decision, implementation authorization, or claim that any behavior already exists in code. Keep the original intent and open questions visible during later reconciliation.

## 1. Working method agreed

The team agreed to capture ideas first and organize them later, rather than prematurely deciding every detail during brainstorming.

1. **Capture:** Preserve ideas, motivations, real-life examples, concerns, and proposals in the central document.
2. **Reconcile:** Group related concepts, identify duplication and conflicts, and distinguish agreed principles from proposals and open questions.
3. **Sequence:** Express the reconciled material as user journeys and ordered system steps.
4. **Gap analysis:** Proactively ask about cases not yet discussed, including permissions, privacy, security, data integrity, failures, recovery, and UX.
5. **Complete and validate:** Discuss the gaps, record answers, validate consistency across the system, and only then consider architecture and implementation.

Do not treat a captured proposal as a confirmed decision. Avoid asking the user to repeat a question already answered in the project record. Ask focused questions progressively where answers materially affect decisions.

## 2. Farm Workspace and Archive

### Intent

Farm records new births and ongoing care regularly. Showing every historical pet and completed transfer alongside current work would clutter the Farm's daily workspace and make active work harder to find.

### Captured concept

- **Farm Workspace:** Show pets and work the Farm is currently responsible for, including current care and follow-up tasks.
- **Archive:** When a pet transfer has completed successfully, the completed work should leave the active workspace and be archived.
- Archive items should **not appear mixed into the everyday active list**. They should be retrievable only when needed, through an intentional search/retrieval action.
- Archive is not deletion. It is a Farm-side organizational state for completed work.
- Retrieving an archived record must not, by itself, restore the Farm as current caregiver or grant access to the receiving Home's later Life Journey.
- The system should reduce the need for manual cleanup by moving completed work out of the active workspace through the transfer workflow.

### Open questions for reconciliation

- What exact event marks a transfer as completed: recipient acceptance, a final confirmation, or another verified state?
- What record and documents may the Farm retain in its Archive, and for how long?
- Is the Farm archive a view/reference to preserved records, a limited snapshot, or another model? Do not assume it is a duplicate of the Pet's canonical history.
- What should happen if a transfer is cancelled, disputed, reversed, or accepted by the wrong recipient?
- What search fields and access audit are appropriate for archived records?

## 3. Pet Life Journey and transfer from Farm to Home

### Intent

Care records created by the Farm should form part of the pet's continuing life history, not a temporary Farm-only feed that requires the Farm to tag the future Home manually.

### Captured concept

- The Farm's recording tools should be designed so relevant pet-specific records are intended to be carried forward with the pet.
- The Home receiving the pet (example: Home A) should, after a successful and authorized handoff, be able to see the pet's relevant history **from birth through the day of transfer**, and continue the pet's Life Journey afterward.
- This transfer of authorized access is based on the pet handoff process, **not on tagging Home A**.
- The pet's story should not restart when the pet changes caregiver or Home. Appropriate provenance and history should remain intact.
- Relevant examples include birth information, group/litter photos, weight records, vaccination, vet visits, care records, certificates, warranty or other pet-related documents where applicable and authorized.
- Pet records and Life Journey should remain connected to the pet's identity/Passport across a transfer, while unrelated Farm or former caregiver personal information stays protected.

### Privacy and access intent

- Access to the pet's authorized history is distinct from access to the Farm's private operational or personal information.
- Receiving the pet's records must not grant access to all Farm data.
- A transfer does not grant either party broad access to the other party's private Home information.
- The shared/transfer-related history is intended to be private and governed by explicit access rules for the authorized parties. Tagging is not the access-control mechanism for this transfer.

### Open questions for reconciliation

- Which record types are part of the pet's transferable history, which are Farm-internal, and which need explicit review before sharing?
- How are provenance, correction history, evidence source, and retrospective entries represented?
- How do we distinguish a care event's actual time from the time it was entered?
- What happens when a record contains personal information about other people or unrelated animals?
- How are disputes, incorrect records, duplicate records, and transfer reversals handled?
- Is the transfer-related private Journey a distinct access-controlled Journey, a pet-owned record stream, or another product concept? Keep this unresolved until reconciliation.

## 4. QR Token with Message and Guide Journey

### Intent

The transfer should feel like a meaningful handoff of a pet's story, not merely the delivery of a bundle of documents.

### Captured flow

1. **Prepare transfer:** Farm opens the pet's Passport and starts the guided transfer process.
2. **Review shareable records:** Farm reviews the pet identity, birth/care history, and documents that are appropriate to pass on.
3. **Compose a Message:** The system provides a warm editable starter message. Example discussed: “วันนี้ลาเต้กำลังไปอยู่กับครอบครัวของลาเต้แล้วครับ ลาเต้ขอบคุณฟาร์มมากครับที่ดูแลลาเต้มาเป็นอย่างดี”
4. **Create QR Token:** Generate a QR Token that initiates or links to the controlled transfer process and the authorized information. The Message is presented above the QR code; the Guide Journey helps the Farm complete the steps.
5. **Recipient scans and verifies:** The receiving caregiver scans the QR, reviews the handoff and relevant information, and explicitly accepts responsibility for the pet.
6. **Complete transfer:** Only after the required confirmation succeeds should access and care status transition.
7. **Preserve the transition:** A transfer-related Life Journey record may capture the handoff and the warm message, with access governed by the transfer permissions.
8. **Continue the story:** Home A can continue recording the pet's life after the transfer.

### Important distinction

- **Message** provides the narrative/invitation and human meaning of the handoff.
- **QR Token** initiates or connects to the controlled transfer process.
- **Guide Journey** guides the Farm through preparation, message composition, document review, QR generation, and completion.
- The QR should not be treated as a bare, unrestricted static link. The transfer concept requires appropriate recipient verification/acceptance, permissions, and a transfer record.

### Open questions for reconciliation

Token expiry, one-time use, revocation, recipient identity verification, authentication requirements, failed scans, accidental sharing, transfer cancellation, and the exact format of the Message are not yet decided.

## 5. Access transition and Farm Archive after transfer

### Captured concept

- Before handoff, Farm X can access the relevant Life Journey as the active caregiver/recording party within the defined rules.
- After a successful transfer to Home A, Farm X's access to the continuing Journey should end.
- Farm X retains an Archive of the completed transfer and the historical material it is permitted to retain.
- Home A can see the pet's authorized history from birth through the handoff and continue adding new memories and care records.
- Farm X should not automatically see Home A's new Journey entries merely because it created the earlier records or completed the transfer.
- Archive is a Farm-side retention/retrieval concept; it must not delete or replace the canonical pet history and must not itself create new permissions.

### Principle

**The pet can change Homes without losing the continuity of its life story; the former caregiver can finish its work without retaining automatic access to the new Home's future.**

### Open questions for reconciliation

Clarify whether the Farm Archive contains a limited historical view, an immutable transfer receipt, permitted copies of specific records, or a combination. Define retention and access boundaries without exposing Home A's later private entries.

## 6. Multi-Provider Identity and Account Recovery

### Real-life problem that motivated this concept

A family member may get a new phone, forget which Google Account was used, lose written notes, and repeatedly ask a relative to create a new Google Account. Depending on a family member to keep credentials is not an appropriate long-term solution. Losing access to a login provider should not casually strand a user's Home, User profile, Pets, Passport, or Life Journey.

### Captured direction

- Separate the user's **Meow World Identity** from external Login Providers and contact/recovery channels.
- A stable Meow World identity should link to the same User, Home memberships, Pet relationships, and Life Journey even if the user changes devices or uses a different verified login provider.
- Consider multiple providers/channels where technically and legally supported, such as Google, Apple, LINE, Facebook, TikTok, phone number, and email. Do not assume every provider supports equivalent login capabilities or that every contact channel can authenticate users.
- Recovery/contact information may be added progressively after initial signup; avoid a burdensome form at the start.
- A verified provider should lead to the existing identity it was explicitly linked to, not create a separate identity every time.
- Do not automatically merge accounts solely because display names or email strings match. Account linking must be verified and safe.
- Removing a provider must not leave the user without a viable login/recovery path unless the consequences are clearly handled.
- Plan a recovery route for the case where all providers are lost; do not assume multiple providers alone solve every failure.
- The pet-transfer QR Token is not automatically an account-recovery token; those flows have different purposes and risks.
- Recovery must not automatically change permissions for other members of a shared Home.

### Progressive Recovery Readiness

The system may gently recommend adding or verifying recovery methods over time, considering:
- elapsed time since signup;
- usage/context and whether the user has begun relying on the service;
- current recovery readiness and whether verified alternatives are still available.

Prompts should be relevant, low-pressure, dismissible, and not repeatedly shown without a reason. Avoid treating number of photos or journeys as the only measure of importance. Do not collect more personal information than necessary, and explain why a recovery method is useful.

### Principles

- Easy to start; easy to return.
- Users should not need to be technically skilled to preserve their memories.
- Preserve identity and continuity; do not create a new Home/data island when the user meant to return to the old one.
- Security and privacy remain mandatory: convenient recovery must not enable impersonation or unauthorized access.
- Prefer a cost-conscious, maintainable approach suitable for a small team.

### Open questions for reconciliation

- What are the primary, secondary, and exceptional recovery methods?
- What evidence is sufficient when all provider access is lost?
- How should a user with a new account be guided when a prior identity may exist, without revealing private data to an impostor?
- What are the rules for verified phone/email changes, recycled phone numbers, compromised providers, and unlinking a provider?
- What minimum readiness level is recommended, and when should prompts appear?
- Which provider integrations are technically supported and worth maintaining for the target users?

## 7. Cross-cutting principles captured

- **Memory continuity:** Home, User, Pet, Passport, and Life Journey should remain correctly linked through ordinary account/device changes and pet transfers.
- **Data separation and permission separation:** A relationship between records must not silently grant access to other data.
- **Least privilege:** Grant only the access needed for the specific purpose.
- **Archive, not delete:** Completed work should be out of the active workspace while appropriate historical evidence remains retrievable.
- **Transfer with consent:** Handoff requires a controlled, confirmed transition, not just possession of a QR image.
- **Human-friendly UX:** Respect existing Farm workflows and the real limits of users' memory and technical confidence.
- **No implementation claims without evidence:** Concepts are not evidence of working UI, business logic, or persisted data.
- **Capture first, reconcile once:** Do not prematurely force every idea into a final architecture.

## 8. Status at capture time

- This document captures the afternoon discussion of 2026-10-12.
- The concepts and principles above are preserved for later Reconcile.
- Items explicitly listed as open questions remain unresolved.
- No architecture, schema, implementation scope, or feature release is approved by this capture alone.
