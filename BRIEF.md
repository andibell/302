## Nimva Risk Portfolio Intelligence

### Project Type

Protogen P302 Capstone: Interactive Data Story

### Project Purpose

Recreate and white-label an existing enterprise specialty-insurance web application as an interactive data story.

The application is based on an existing UX concept and visual design. **The objective is not to redesign the application.** The objective is to faithfully translate the supplied reference screenshots into a functional Vue/Vite web application, replace all client-specific branding and information with a fictional enterprise brand and synthetic data, and use the interactions inherent in the existing design to reveal a clear data story.

The final experience should demonstrate thoughtful information hierarchy, data visualization, progressive exploration, responsive interaction, and a clear point of view rather than functioning as a collection of unrelated dashboard metrics.

---

## Fictional Brand

- **Company:** Nimva Risk
- **Product:** Portfolio Intelligence
- **Short product label:** Nimva
- **Brand promise:** “Clearer data. Stronger tomorrows.”

Nimva Risk is a fictional specialty-insurance technology company that helps Managing General Agents and Program Administrators understand portfolio performance, identify emerging risk, and make more informed portfolio decisions.

All branding, company information, people, portfolio data, alerts, news, documents, and other content used in the application must be fictional or synthetic.

No original client or consulting-company names, logos, proprietary data, or identifiable client information should appear in the finished application.

---

## Target User

### Specialty Insurance Portfolio Leader

The primary user is a senior portfolio, underwriting, or insurance-program leader responsible for monitoring the performance of a specialty insurance portfolio.

The user needs to understand overall portfolio health while being able to investigate changes in:

- Premium
- Loss performance
- Retention
- Claims frequency
- Rate
- Portfolio mix
- Regions
- Products
- Subproducts
- Data quality

The experience should allow the user to begin with a high-level understanding of performance and progressively move into more granular analysis.

---

## User Decision

The core decision the experience should help the user make is:

> **Where in the portfolio should attention or investigation be focused without unnecessarily disrupting otherwise healthy growth?**

The experience should help the user distinguish between portfolio-wide deterioration and problems concentrated within particular segments.

---

# Data Story

## Point of View

> **Portfolio growth can mask emerging risk.**

A portfolio can appear healthy at an aggregate level while underlying performance begins deteriorating in a concentrated portion of the business.

Nimva Portfolio Intelligence helps users recognize an emerging signal, compare actual performance with expectations, investigate the portfolio dimensions contributing to the change, assess whether supporting data is reliable, and identify where action is warranted.

## Narrative Arc

The application should reveal the story progressively through interaction.

### 1. Portfolio Health

The user begins on the Overview.

At first glance, the portfolio appears relatively healthy.

Indicators may show:

- Growing or stable written premium
- Healthy retention
- Acceptable rate change
- Mostly positive status indicators
- Continued portfolio growth

**Narrative takeaway:**

> Overall portfolio performance appears healthy.

### 2. Emerging Signal

One KPI or portfolio alert indicates that loss performance is beginning to diverge from expectations.

The signal should be noticeable without making the entire portfolio appear distressed. The user should be encouraged to investigate.

**Narrative takeaway:**

> Something beneath the aggregate portfolio result is changing.

### 3. Actual vs. Expected Performance

The user enters Portfolio Intelligence.

Visual analysis compares actual and expected performance over time. The visualization should reveal a point where actual loss performance begins diverging materially from expectations.

The primary analysis should emphasize:

- Actual Loss Ratio
- Expected Loss Ratio
- Reported or incurred loss
- Premium
- Trend over time

**Narrative takeaway:**

> Loss performance is deteriorating even though the portfolio continues to grow.

### 4. Concentration

The user explores the portfolio through relevant dimensions.

Primary dimensions should include:

- Line of Business
- Subproduct
- Region

Filtering and drill-down should reveal that deterioration is not occurring uniformly across the portfolio. A relatively small segment should account for a disproportionately large share of the negative movement.

**Narrative takeaway:**

> The problem is concentrated rather than portfolio-wide.

### 5. Supporting Evidence

The user can explore additional information, including Data Quality.

Data quality measurements may indicate that some information associated with the problematic segment is incomplete or abnormal.

The application should not imply unsupported causality. Instead, the story should communicate that the combination of abnormal performance and questionable supporting data warrants investigation.

**Narrative takeaway:**

> The signal is meaningful, but additional investigation is necessary before taking broad portfolio action.

### 6. Action

Portfolio Actions closes the loop between insight and intervention. Relevant actions should connect logically to signals surfaced elsewhere in the experience.

The overall narrative becomes:

> **Monitor → Detect → Investigate → Understand → Act**

---

# Required Application Views

Recreate the supplied visual reference screens rather than inventing an unrelated interface.

## 1. Overview

Recreate the portfolio overview experience.

Include:

- Greeting/header area
- Performance to Plan
- KPI cards
- Gauges or comparable indicators
- Plan/current/prior-period comparisons
- Portfolio alerts
- Optimization opportunities
- Clear navigation into deeper analysis

This page establishes the beginning of the data story.

## 2. Portfolio Intelligence: Visual

Recreate the analytics experience represented in the reference screenshots.

Include:

- Visual / Tabular toggle
- Performance navigation
- Reporting-period controls
- Filters
- Primary trend visualization
- Actual versus expected analysis
- Metric legends
- Line of Business breakdown
- Subproduct breakdown
- Region breakdown
- Supporting visualizations

Charts must represent actual synthetic data rather than static decorative graphics.

## 3. Portfolio Intelligence: Tabular

Provide the tabular counterpart to the visual experience.

Include:

- Reporting-period summary
- Earned Premium
- Incurred Loss
- Expected Incurred Loss
- Actual Loss Ratio
- Expected Loss Ratio
- Hierarchical rows
- Expandable portfolio groupings
- Line of Business
- Subproduct
- Region

Visual and Tabular views must use the same underlying synthetic dataset.

## 4. Data

Recreate the Data experience.

Include:

- Data Quality summary
- Binder Controls or equivalent secondary quality measure
- Recent files
- Data/document listing
- Status indicators
- Relevant navigation controls

All filenames and records must be fictional.

## 5. Data Quality Detail

Recreate the detailed Data Quality analysis experience.

Include:

- Overall score
- Comparison score
- Reporting-period selection
- Score trend
- Scorecard
- Quality dimensions
- Table of detected observations or anomalies
- Appropriate status treatments

Data displayed here should relate logically to the broader portfolio story.

## 6. Portfolio Actions

Recreate the portfolio actions experience.

Include:

- Critical
- Moderate
- Low

Allow actions to display:

- Identifier
- Business unit
- Action/job type
- Due date
- Status
- Completion percentage

At least one action should relate directly to the emerging portfolio issue revealed through the data story.

## 7. Optimization

Recreate the optimization experience.

Include:

- Summary opportunity
- Actions needed
- Optimization targets
- Status quo versus optimized comparison
- Performance trend
- Supporting data/model summary

Optimization should feel part of the same product ecosystem but should not introduce a separate competing narrative.

---

# Interaction Requirements

The interface should include meaningful interactions represented by the supplied reference designs.

Required interactions include:

- Primary navigation
- Page tabs
- Visual / Tabular toggle
- Metric selection
- Reporting-period selection
- Line of Business filtering
- Subproduct filtering
- Region filtering
- Expandable/collapsible table groups
- Interactive charts
- Hover/focus states where appropriate
- Reset or clear-filter behavior
- Navigation from high-level signals to deeper analysis

Interactions should update shared underlying data where appropriate. Filters must not exist solely for decoration.

---

# Synthetic Data

All application data must be fictional. Do not use real client datasets.

Create a coherent synthetic specialty-insurance portfolio dataset covering approximately **24 months**.

A portfolio observation may contain fields such as:

- `period`
- `lineOfBusiness`
- `subproduct`
- `region`
- `writtenPremium`
- `earnedPremium`
- `incurredLoss`
- `expectedIncurredLoss`
- `lossRatio`
- `expectedLossRatio`
- `rateChange`
- `retention`
- `policyCount`
- `claimCount`
- `claimFrequency`
- `dataQualityScore`

The dataset must intentionally encode the application's narrative.

### Required Pattern

For most of the initial period:

- Portfolio growth is positive
- Actual and expected losses track reasonably closely
- Aggregate portfolio performance appears healthy

Later in the dataset:

- Actual loss performance begins diverging from expected performance
- The change is concentrated in one or a small number of portfolio segments
- Aggregate performance partially masks the severity of the segment-level change

The data should allow a user to discover this pattern through interaction. Do not simply hard-code text stating the conclusion.

---

# Visual Fidelity

The supplied screenshots are the primary visual references. The implementation should preserve their overall:

- Information architecture
- Hierarchy
- Density
- Card structure
- Navigation patterns
- Whitespace
- Visualization placement
- Tab treatments
- Table organization
- Enterprise tone

This is a **recreation and white-labeling exercise, not a redesign exercise**.

Small adaptations necessary for responsiveness, accessibility, technical implementation, or the Nimva brand are acceptable.

---

# Nimva Visual Identity

Use the new fictional Nimva Risk identity.

## Core Colors

- **Navy:** `#0B1F4B`
- **Blue:** `#2563EB`
- **Teal:** `#14B8A6`

Supporting interface colors should be derived consistently from these colors.

Use semantic colors intentionally for:

- Positive performance
- Warning
- Critical risk
- Informational states
- Neutral states

Do not overuse status colors.

## Logo Asset

Production brand assets are stored in:

`src/assets/brand/`

Available logo variants:

- `NimvaRisk-color.png`
- `NimvaRisk-White.png`

Use `NimvaRisk-White.png` on dark or navy backgrounds. Use `NimvaRisk-color.png` on light backgrounds where appropriate.

Use these application assets in the shell/navigation where the original application's branding appeared. They should replace original branding from the references. Do not recreate, modify, or substitute the Nimva Risk logo unless explicitly instructed. Do not use the original client logo.

---

# Technical Direction

Use:

- Vue 3
- Vite
- JavaScript
- Semantic HTML
- Modern CSS
- Component-driven architecture
- Local synthetic data

Do not introduce a backend unless explicitly instructed later.

Do not use:

- Authentication
- External APIs
- Databases
- Real client data
- Production services

Keep dependencies intentional and minimal. If a charting library is required, choose one library and use it consistently.

---

# Suggested Project Structure

Use the following as a starting point for organizing the application. Adjust it as needed to fit the implementation while keeping responsibilities clear and related features easy to locate.

```text
src/
  assets/
    brand/
      NimvaRisk-color.png
      NimvaRisk-White.png
  components/
    charts/
    common/
    navigation/
    portfolio/
  data/
    portfolio.js
    actions.js
    dataQuality.js
  views/
    OverviewView.vue
    IntelligenceView.vue
    DataView.vue
    DataQualityView.vue
    ActionsView.vue
    OptimizationView.vue
  styles/
    tokens.css
    global.css
  App.vue
  main.js

context/
  visual-reference.md
  data-story.md
  design-system.md

BRIEF.md
README.md
LICENSE
```

Keep synthetic portfolio data and related action and data-quality records in local modules under `src/data/`. Use `context/` for supporting implementation references and keep the root `README.md` focused on setup and running the application.

---

# Visual Reference Files

The supplied screenshots are the authoritative visual references for this implementation. They represent an existing application design and should guide the visual structure, hierarchy, composition, and interaction patterns of the recreated Nimva Risk experience.

## Screen References

Primary visual references are stored in:

`reference/screens/`

Expected reference files:

- `01-overview.png`
- `02-portfolio-intelligence-visual.jpg`
- `03-portfolio-intelligence-tabular.png`
- `04-data.png`
- `05-data-quality-detail.png`
- `06-portfolio-actions.png`
- `07-optimization.png`
- `08-pricing-alert-detail.png`

Before implementing a referenced view, inspect its corresponding screenshot. Use the screenshots to determine:

- Page composition
- Visual hierarchy
- Spacing
- Content density
- Navigation structure
- Card proportions
- Typography hierarchy
- Control placement
- Chart placement
- Table structure
- Tabs
- Filters
- Status treatments
- Interaction patterns visible in the design
- Responsive priorities

The goal is visual and structural fidelity to the supplied designs while replacing original branding, data, people, company information, and client-specific content with the fictional Nimva Risk experience.

Do not redesign a screen solely because another pattern would be easier to implement. Do not reproduce a screenshot as a static background image; recreate the interface with functional Vue components, semantic HTML, CSS, charts, controls, and synthetic data.

Where the screenshots do not establish an interaction, state, responsive behavior, or implementation detail, make a restrained enterprise UX decision consistent with the rest of the reference application.

## Figma Source Files

Additional source design files are stored in:

`reference/figma/`

These files provide supporting design context but are not required for the application to run. Treat the exported screenshots in `reference/screens/` as the primary implementation references. Do not modify the original Figma source files.

---

# Scope Boundaries

## In Scope

- Faithful recreation of supplied reference screens
- Nimva Risk white labeling
- Responsive Vue application
- Synthetic insurance data
- Functional navigation
- Functional filters
- Interactive charts
- Visual / Tabular modes
- Portfolio drill-down
- Data-quality analysis
- Portfolio actions
- Optimization experience
- Meaningful empty states
- Accessibility fundamentals
- Coherent cross-screen data story

## Out of Scope

- Authentication
- User management
- Real portfolio ingestion
- Production APIs
- Backend services
- Databases
- Real document management
- Real file upload
- Messaging
- Meetings functionality
- Notification infrastructure
- Production predictive modeling
- Real optimization algorithms
- Real customer information

---

# Accessibility

Treat accessibility as an implementation requirement rather than an afterthought.

At minimum:

- Use semantic page structure
- Ensure controls are keyboard accessible
- Provide visible focus states
- Use useful button labels
- Associate accessible labels with form controls
- Maintain sufficient color contrast
- Do not rely exclusively on color to communicate status
- Give charts meaningful titles or supporting textual summaries
- Preserve readability in responsive layouts

---

# Responsive Behavior

The visual references are primarily desktop-oriented. Desktop should receive the highest fidelity, but the experience must remain usable at smaller widths.

At narrower widths:

- Grids may stack
- Cards may reflow
- Tables may use deliberate horizontal scrolling when necessary
- Controls may wrap
- Primary navigation must remain usable
- Charts must resize without clipping important information

Do not arbitrarily remove important content on smaller screens.

---

# P302 Success Criteria

The finished app should demonstrate that:

1. There is a recognizable data-story point of view.
2. The data contains an intentionally designed pattern.
3. Interaction helps reveal that pattern.
4. Visual hierarchy directs attention toward important information.
5. Different views of the data remain internally consistent.
6. The user can progressively move from aggregate performance to a specific problem area.
7. The story supports a meaningful portfolio decision.
8. The interface represents a plausible enterprise insurance product.
9. The application is functional and responsive.
10. The final implementation remains recognizably faithful to the supplied UX reference designs.