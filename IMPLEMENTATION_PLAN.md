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