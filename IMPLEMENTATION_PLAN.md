# Implementation Plan: GroupFBMap

This document outlines the phased implementation plan for the GroupFBMap project, based on the Product Requirements Document (v1.1) and the defined development tickets.

## Phases and Tickets

The plan follows the sequential tickets (GFM-001 to GFM-017), grouped into logical phases:

**Phase 1: Foundational Infrastructure Setup**

*   **GFM-001:** Initial Infrastructure Setup - AWS Core Services (IAM Role, DynamoDB Table, S3 Bucket)
*   **GFM-002:** Initial Infrastructure Setup - API Gateway & Lambda Placeholders (Depends on GFM-001)
*   **GFM-003:** Initial Infrastructure Setup - Frontend Hosting & Repo (GitHub Repo, GitHub Pages)

**Phase 2: Basic Frontend & Map**

*   **GFM-004:** Frontend - Basic Structure & Map Display (HTML, Tailwind, Leaflet - Depends on GFM-003)
*   **GFM-005:** Frontend - Initial Load Logic & Getting Started Dialog (localStorage check, Dialog UI - Depends on GFM-004)

**Phase 3: Core "Join" Feature (No Avatar)**

*   **GFM-006:** Backend - Implement `addMember` Logic (No Avatar) (DynamoDB Put, Token Generation - Depends on GFM-002)
*   **GFM-007:** Frontend - Implement "Join Group Map" Flow (No Avatar) (Geolocation, Form, API Call, localStorage Save - Depends on GFM-005, GFM-006)

**Phase 4: Core "View Members" Feature**

*   **GFM-008:** Backend - Implement `getGroupMembers` Logic (DynamoDB Query - Depends on GFM-002, GFM-006)
*   **GFM-009:** Frontend - Display Members on Map (API Call, Marker Creation, Group Switching - Depends on GFM-004, GFM-005, GFM-007, GFM-008)

**Phase 5: Core "Delete" Feature (No Avatar)**

*   **GFM-010:** Backend - Implement `deleteMember` Logic (No Avatar) (GSI Query, DynamoDB Delete - Depends on GFM-002, GFM-006)
*   **GFM-011:** Frontend - Implement Delete Flow (Dialog, API Call, UI Update, localStorage Clear - Depends on GFM-009, GFM-010)

**Phase 6: Avatar Handling**

*   **GFM-012:** Backend - Add Avatar Upload & Resizing (`addMember` update, S3 Put, Image Lib - Depends on GFM-006, GFM-001)
*   **GFM-013:** Backend - Add Avatar Deletion (`deleteMember` update, S3 Delete - Depends on GFM-010, GFM-012)
*   **GFM-014:** Frontend - Add Avatar Upload Input & Display (Join Form update, Map Display update - Depends on GFM-007, GFM-009, GFM-012)

**Phase 7: Polish, Deployment & Testing**

*   **GFM-015:** UI/UX Polish & Final Review (Styling, Responsiveness, Error Messages - Depends on GFM-011, GFM-014)
*   **GFM-016:** Deployment - Domain Configuration & Final Setup (DNS, CORS, HTTPS - Depends on GFM-003, GFM-015)
*   **GFM-017:** Testing - End-to-End Validation (All flows, Cross-browser/device - Depends on GFM-016)

## Ticket Dependencies Visualization (Mermaid Diagram)

```mermaid
graph TD
    subgraph Phase 1: Infrastructure
        GFM001[GFM-001: AWS Core]
        GFM002[GFM-002: API GW & Lambdas]
        GFM003[GFM-003: Frontend Hosting]
        GFM001 --> GFM002
    end

    subgraph Phase 2: Basic Frontend
        GFM004[GFM-004: Map Display]
        GFM005[GFM-005: Initial Load Logic]
        GFM003 --> GFM004
        GFM004 --> GFM005
    end

    subgraph Phase 3: Core Join (No Avatar)
        GFM006[GFM-006: Backend addMember]
        GFM007[GFM-007: Frontend Join Flow]
        GFM002 --> GFM006
        GFM005 --> GFM007
        GFM006 --> GFM007
    end

    subgraph Phase 4: Core View
        GFM008[GFM-008: Backend getMembers]
        GFM009[GFM-009: Frontend Display Members]
        GFM002 --> GFM008
        GFM006 --> GFM008
        GFM004 --> GFM009
        GFM005 --> GFM009
        GFM007 --> GFM009
        GFM008 --> GFM009
    end

    subgraph Phase 5: Core Delete (No Avatar)
        GFM010[GFM-010: Backend deleteMember]
        GFM011[GFM-011: Frontend Delete Flow]
        GFM002 --> GFM010
        GFM006 --> GFM010
        GFM009 --> GFM011
        GFM010 --> GFM011
    end

    subgraph Phase 6: Avatar Handling
        GFM012[GFM-012: Backend Avatar Upload]
        GFM013[GFM-013: Backend Avatar Delete]
        GFM014[GFM-014: Frontend Avatar I/O]
        GFM001 --> GFM012
        GFM006 --> GFM012
        GFM010 --> GFM013
        GFM012 --> GFM013
        GFM007 --> GFM014
        GFM009 --> GFM014
        GFM012 --> GFM014
    end

    subgraph Phase 7: Polish & Deploy
        GFM015[GFM-015: UI/UX Polish]
        GFM016[GFM-016: Deployment Config]
        GFM017[GFM-017: E2E Testing]
        GFM011 --> GFM015
        GFM014 --> GFM015
        GFM003 --> GFM016
        GFM015 --> GFM016
        GFM016 --> GFM017
    end

---

## Revision: Non-Blocking Notifications & .gitignore Update (2025-04-09)

This revision addresses the request to replace blocking `alert`/`prompt` dialogs with a non-blocking UI notification banner and to add `*.zip` to the `.gitignore` file.

**1. Implement Non-Blocking Notifications:**

*   **HTML (`index.html`):** Add a `div` element near the top of the `<body>`, styled to be fixed or absolutely positioned at the top of the viewport. It will be hidden by default.
    *   Example: `<div id="notification-banner" class="notification hidden"></div>`
*   **CSS (`style.css`):**
    *   Add styles for `#notification-banner` defining its position (e.g., `position: fixed; top: 0; left: 0; right: 0; z-index: 1000;`), padding, text alignment, etc.
    *   Add styles for the base `.notification` class (e.g., transitions for showing/hiding).
    *   Create modifier classes for different states:
        *   `.notification-success` { background-color: lightgreen; color: black; }
        *   `.notification-error` { background-color: lightcoral; color: white; }
    *   Add styles for the `.hidden` class (`display: none;` or similar).
    *   (Optional) Include styling for a small 'x' close button within the banner.
*   **JavaScript (`script.js`):**
    *   Create a new helper function, `showNotification(message, type = 'success', duration = 5000)`:
        *   Accepts message text, type ('success' or 'error'), and optional auto-hide duration.
        *   Finds the `#notification-banner` element.
        *   Sets the `textContent` of the banner.
        *   Applies the correct type class (`notification-${type}`).
        *   Removes the `hidden` class.
        *   Uses `setTimeout` to re-add the `hidden` class after `duration` (if positive). Clears existing timeouts.
        *   (Optional) Add event listener for a close button.
    *   **Modify `joinForm` Submit Handler:**
        *   Replace `prompt(...)` (line ~408) with:
            `showNotification("Success! You've been added. IMPORTANT: Your Delete Token was previously shown and needs to be saved securely.", 'success', 7000);`
    *   **Modify `deleteForm` Submit Handler:**
        *   Replace `alert(...)` (line ~503) with:
            `showNotification("Success! Your entry has been deleted from the map.", 'success');`
    *   **Replace Error Alerts:** Replace other error `alert()` calls (e.g., lines ~85, ~97, ~130, ~170, etc.) with `showNotification(errorMessage, 'error')` for consistency.

**2. Update `.gitignore`:**

*   Read the current content of the `.gitignore` file.
*   Append the line `*.zip` to the end of the content, ensuring it's on a new line.
*   Write the updated content back to the `.gitignore` file.

**Notification Logic (Mermaid Diagram):**

```mermaid
graph TD
    subgraph User Action
        A[Submit Join/Delete Form] --> B{API Call};
    end

    subgraph API Response Handling (script.js)
        B -- Success --> C[Call showNotification('Success Message', 'success')];
        B -- Error --> D[Call showNotification('Error Message', 'error')];
    end

    subgraph Notification UI (HTML/CSS/JS)
        C --> E{Update Banner Text & Style};
        D --> E;
        E --> F[Show Banner];
        F -- After Timeout / Close Click --> G[Hide Banner];
    end

    style F fill:#lightgreen,stroke:#333,stroke-width:2px
    style G fill:#grey,stroke:#333,stroke-width:1px
```

---

## Feature: FAQ Navbar and Content (2025-04-09)

This section outlines the plan to add a simple FAQ navbar link that toggles the visibility of a formatted FAQ content section.

**1. Modify `index.html`:**

*   **Add Navbar:** Insert a `<nav>` element directly inside the `<body>` tag, before `#notification-banner`.
    *   Style using Tailwind (e.g., `bg-gray-800`, `text-white`, `p-2`, `flex`, `justify-end`).
    *   Add an `<a id="faq-link">` tag inside with text "FAQ" and appropriate styling (e.g., `hover:underline`, `cursor-pointer`).
*   **Add FAQ Content Div:** Insert `<div id="faq-content">` immediately after the `<nav>`.
    *   Add the `hidden` Tailwind class.
    *   Style using Tailwind (e.g., `bg-white`, `p-6`, `mt-2`, `rounded`, `shadow-md`, `max-w-3xl`, `mx-auto`).
*   **Format FAQ Text:** Populate `#faq-content` with the provided FAQ text using semantic HTML (`h1`, `h2`, `p`, `a`, `code`, `ul`, `li`).

**2. Modify `script.js`:**

*   Inside the `DOMContentLoaded` event listener:
    *   Get references to `#faq-link` and `#faq-content`.
    *   Add a `click` event listener to `#faq-link`.
    *   In the callback, toggle the `hidden` class on `#faq-content` (`faqContent.classList.toggle('hidden');`).

**Visual Plan (Mermaid Diagram):**

```mermaid
graph TD
    A[User Clicks "FAQ" Link (#faq-link)] --> B{Toggle Visibility of #faq-content};
    B -- Was Hidden --> C[Show #faq-content];
    B -- Was Visible --> D[Hide #faq-content];

    subgraph HTML Changes (index.html)
        direction TB
        E(body) --> F(nav);
        F --> G(a#faq-link{"FAQ"});
        E --> H(div#faq-content.hidden);
        H --> I(Formatted FAQ Text);
        E --> J(Existing Content: #notification-banner, #app-container, etc.);
    end

    subgraph JavaScript Changes (script.js)
        direction TB
        K(DOMContentLoaded) --> L{Get Elements};
        L --> M(faqLink = getElementById('faq-link'));
        L --> N(faqContent = getElementById('faq-content'));
        K --> O{Add Event Listener};
        O --> P(faqLink.addEventListener('click', toggleFaq));
        P --> Q{toggleFaq Function};
        Q --> R(faqContent.classList.toggle('hidden'));
    end

    A -- triggers --> O;
    C -- modifies --> H;
    D -- modifies --> H;