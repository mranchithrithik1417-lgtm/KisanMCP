# KisanClaim MCP Architecture Documentation

## Overview
**KisanClaim MCP** is an autonomous crop insurance claim adjudication system designed for rural farmers in India. Built for **wHACKiest 2026 (Track 1: "Make MCP Matter")**, it implements the Model Context Protocol (MCP) to turn raw satellite data, weather station records, and geotagged field photos into legally defensible insurance claim dossiers.

```mermaid
flowchart TD
    subgraph FarmerApp["Farmer Mobile Interface (React 18 + Leaflet)"]
        UI_Map["Esri Satellite Plot Marker (Shapely)"]
        UI_Cam["Canvas Geotagged Stamper (GPS + DIGIPIN)"]
        UI_Voice["Voice TTS (kn-IN & en-IN) & Mic"]
        UI_Confirm["Explicit Token Confirmation Gate"]
    end

    subgraph BackendAPI["FastAPI Backend (Port 8000)"]
        REST["REST API Endpoints"]
        AgentCore["Guided State Machine / MCP Client"]
        LocalDB[(SQLite kisanclaim.db)]
    end

    subgraph MCPServer["FastMCP Server (stdio Subprocess)"]
        Tools["8 Registered MCP Tools"]
        AuditLog["Immutable tool_audit_log Ledger"]
    end

    subgraph ServiceEngines["Shared Business Logic (backend/services/)"]
        S_Digipin["DIGIPIN 10-Level Hierarchical Geocoder"]
        S_Geo["Shapely Projected Area & Perimeter Engine"]
        S_Sat["Sentinel-2 STAC / NDVI Loss Analysis"]
        S_Rain["Open-Meteo Archive API + SQLite Cache"]
        S_Photo["400m Buffer Geofence Verifier"]
        S_Score["Rule Scoring Engine (0-100)"]
        S_PDF["ReportLab PDF Dossier Generator + QR"]
    end

    subgraph InsurerPortal["Insurer Review Console (/insurer)"]
        I_Review["Claims Queue & Evidence Inspection"]
        I_Audit["MCP Tool Audit Trail Viewer"]
        I_Action["Approve / Reject / Note Adjudication"]
    end

    FarmerApp <--> REST
    REST <--> AgentCore
    AgentCore <--> Tools
    Tools <--> ServiceEngines
    ServiceEngines <--> LocalDB
    Tools --> AuditLog
    AuditLog --> LocalDB
    InsurerPortal <--> REST
```

## Security Gate Architecture
The Model Context Protocol specification separates tool invocation from unilateral execution. In KisanClaim MCP:
1. `draft_claim()` creates a preliminary record and generates a cryptographically random one-time confirmation token (`TOK-XXXX`) valid for 30 minutes.
2. `submit_claim(draft_id, token)` strictly enforces token validation:
   - Token must exist in `claim_tokens`.
   - Token must match `draft_id`.
   - Token must not have `used = 1`.
   - Current time must not exceed `expires_at`.
3. If valid, the token is marked used (`used = 1`), verification scoring is executed, and the claim status transitions to `SUBMITTED`.
4. It is impossible for an autonomous AI or attacker to file a claim without the farmer's explicit consent.
