---
name: Semvi
description: A live job card for a Tari Ootle payout vault, and a console that proves a retry is refused.
colors:
  stock: "#E9EDF1"
  card: "#FFFFFF"
  ink: "#0E141C"
  muted: "#596473"
  rule: "#CDD4DC"
  cobalt: "#2340D3"
  cobalt-soft: "#E3E8FB"
  stamp: "#C81E37"
  stamp-soft: "#FBE6E9"
typography:
  display: "Bricolage Grotesque 800, stretch 84%, tracking -0.045em"
  body: "Instrument Sans 400-600"
  data: "Martian Mono 400-500 for hashes, labels and the Tari call feed"
signature: "The job card: a 16x16 grid of punch holes, one per job ID the vault can ever pay (256), read live from the public indexer. Paid jobs are punched and never cleared."
stamps: "Paid (cobalt) and Refused (red) are rubber-stamp marks on ticket-shaped transaction cards."
---

The 2026-11-20 redesign replaced the earlier green sidebar layout. The design notes below describe that earlier interface and are kept for history.


# Design System: Semvi

## Overview

**Creative North Star: "The Remittance Receipt"**

The remittance receipt gives Semvi a restrained green, ink and white vocabulary. Ruled rows, aligned amounts and compact labels make payment evidence easy to inspect. The visual emphasis belongs to the recorded result and its immediately adjacent provenance.

Public Sans carries both headings and working text; system monospace distinguishes transaction identifiers and commands. Flat tonal surfaces and modest corners keep the interface calm and practical.

**Key Characteristics:**
- Green result band paired with a pale provenance band.
- Ruled transaction rows with aligned numeric amounts.
- Self-hosted Public Sans with monospace technical values.
- Flat white workspace and a pale navigation rail.

## Colors

A deep settlement green anchors a white and gray-green workspace, with ink for content and amber for a consumed-job refusal. Frontmatter values are extracted from `web/style.css` and are normative.

### Primary
- **Settlement Green** (`green`): result band, links, selected navigation text and paid outcomes.
- **Receipt Wash** (`green-soft`): provenance, notices and secondary button hover.

### Secondary
- **Refusal Amber** (`amber`): “Already paid” outcomes; refusal remains explicit in text.
- **Error Red** (`error`): invalid intent inspection status.

### Neutral
- **Receipt Ink** (`ink`): headings and primary text.
- **Muted Green Gray** (`muted`): supporting prose, labels and status text.
- **White Paper** (`paper`): workspace and buttons.
- **Pale Rail** (`sidebar`): navigation and file selection area.
- **Ruled Gray** (`line`): transaction rules, dividers and code borders.
- **Code Paper** (`code-surface`): commands and waiting buttons.
- **Navigation Hover / Selection** (`nav-hover`, `nav-selected`): distinct interactive navigation states.
- **Control / Upload Stroke** (`button-border`, `upload-border`): solid button and dashed file-area boundaries.

The focus token supplies the shared keyboard outline. Status colors supplement wording rather than carrying the meaning alone.

**The Adjacent Provenance Rule.** Keep the evidence source, network and recorded date attached to the result they qualify. A mainnet indexer read cannot stand in for settlement proof.

## Typography

Public Sans is self-hosted from `web/fonts/public-sans.ttf`, with a variable weight range from 400 to 700 and `font-display: swap`. The fallback is sans-serif. Technical values use the system monospace stack in the frontmatter.

### Hierarchy
- **Headline:** fluid, semibold, tightly tracked page headings; mobile uses a fixed (1.95rem) size and (1.2) line height.
- **Title:** semibold result heading; mobile reduces it to (1.2rem).
- **Body:** normal-weight working text; explanatory paragraphs use muted ink with generous line height (1.7).
- **Label:** compact controls and supporting text. Navigation uses medium weight with a semibold selection.
- **Code:** commands, identifiers and intent values. Amounts are right aligned with tabular numerals.

Explanatory copy is constrained to about (70ch); run instructions and notices to (75ch). Do not derive a geometric type scale: the current sizes serve individual reading roles.

## Layout

The desktop shell is a two-column workspace with a navigation rail (235px) and flexible main region. The main region caps at (1320px), panels at (1120px). Desktop panels have horizontal padding (3rem); the header is (76px) high. Section boundaries use whitespace and thin rules.

At a viewport width of (1000px) or below, the rail narrows to (195px) and panel gutters to (1.5rem). At (700px) or below, the rail becomes a top header with horizontal navigation; the sidebar note and footer blurb disappear. Panel gutters become (1.2rem), the topbar is (54px) tall and source links remain visible. Above (1500px), the shell caps at (1500px) and centers.

Attempt rows retain four columns on mobile: attempt, truncated transaction, explicit result and amount. The final mobile column sizes are (35px), flexible (minimum 30px), (96px) and (54px). Expandable details reveal complete hashes. Intent details wrap long values beside a label column (130px desktop, 110px mobile). Code blocks scroll horizontally rather than breaking commands.

## Elevation & Depth

**The Flat Receipt Rule.** Separate surfaces with tone and fine rules; the incumbent interface has no box shadows.

The sidebar is pale, the workspace white, the recorded result dark green and provenance pale green. One-pixel dividers organize attempts and intent fields. There are no gradients or floating overlays in the captured UI.

## Shapes

Corners are modest: file-selector buttons are gently squared, navigation and secondary controls lightly rounded, notices and code blocks slightly softer, and the joined receipt and upload area the softest. The result rounds only its top corners; provenance rounds only its bottom corners, forming one receipt. The checkmark sits inside a circular outlined badge (44px). Upload uses a dashed border; data rows use straight horizontal rules.

## Components

### Buttons

Quiet outlined actions support the work. Secondary buttons use the white surface, green text and a thin control stroke. Hover introduces the receipt wash; disabled network checks use muted text and code paper with a waiting cursor. Copy actions change their label to report success or clipboard failure. There is no filled primary action button in the current implementation.

All buttons, links, inputs and disclosure summaries use the shared keyboard outline (3px solid, 4px offset). No hover transition is defined.

### Navigation

Left-aligned medium-weight text buttons sit on the pale rail. Hover darkens the pale background; selected navigation uses a green wash and semibold green text. The active button carries `aria-current="page"`. Mobile presents the same three destinations in one horizontal row.

### Cards / Containers

The signature receipt joins the green result band to a pale provenance band with no gap. Provenance names the recorded engine run, localnet, version and date. Notices reuse the pale fill with muted prose. Command blocks use a bordered pale code surface with horizontal overflow.

### Inputs / Fields

The intent selector is a native file input inside a pale, dashed container with a visible label and helper text. Its file-selector button uses a thin line, white fill and small corners. A separate status region reports empty, valid-structure and error states. The built UI has no general text input or chip component to document.

### Ruled Attempt Rows

Column labels sit between two thin rules. Each attempt has a ruled bottom edge, an explicit paid or already-paid label and a right-aligned amount. “Inspect attempt” opens a native disclosure containing the complete transaction identifier and refusal reason when applicable.

### Motion and Status

A newly visible panel uses a brief reveal (0.2s) only when reduced motion has not been requested. It animates a shallow clipping inset to the full panel. Loading, inspection and network status are textual live regions. Mainnet checks begin only after a user action and report their own checked time or retryable failure separately from recorded proof.

## Do's and Don'ts

### Do:
- **Do** keep recorded localnet provenance adjacent to the recorded result.
- **Do** distinguish the mainnet read check from payment settlement evidence.
- **Do** preserve text labels for paid, refused, loading and error states.
- **Do** wrap full identifiers in details and allow command blocks to scroll.
- **Do** use the existing Public Sans and system monospace roles.

### Don't:
- **Don't** use a success check to imply a mainnet payout when only localnet proof is shown.
- **Don't** turn structural intent inspection into a signature verification claim.
- **Don't** replace the ruled receipt vocabulary with decorative card grids.
- **Don't** add shadows, gradients or ornamental animation to this captured system.

## Mainnet proof hierarchy — 20 November 2026
The default proof view leads with the real mainnet run: settlement, recipient balance before/after retries, distinct transaction receipt links and a public receipt comparison. State that both demo relayer accounts share our wallet. Archive execution reasons separately from what public receipts prove. Place the five-attempt localnet engine run in a labelled disclosure below. At phone width, attempts stack their outcome, explanation, short linked hash and amount; avoid narrow status columns. Preserve the remittance receipt palette, Public Sans and ruled records. Deep links #proof, #inspect and #run must restore navigation.
