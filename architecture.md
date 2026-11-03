# System Architecture: PanDrop Unified AI Marketplace

## 1. End-to-End Architecture Diagram

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                   UNIFIED USER ACCOUNT (Can Buy & Sell)                   │
│       (Switch or Login as @alex, @maya, @sam, or Create New Account)      │
└──────────────────┬─────────────────────────────────────┬──────────────────┘
                   │                                     │
      [1. EXTRACT & POST FLOW]              [2. DISCOVER, INSPECT & BUY FLOW]
                   │                                     │
                   ▼                                     ▼
┌─────────────────────────────────────┐ ┌───────────────────────────────────┐
│ POST /api/v1/jobs (Upload Video)    │ │ GET /api/v1/marketplace/listings  │
│  ├─► FFmpeg Audio & Frame Split     │ │  ├─► Search Query (?q=headphones) │
│  ├─► Muse Voice Transcribe          │ │  ├─► Category & Price Filters     │
│  ├─► Muse Spark (Items + Prices)    │ │  └─► Min Condition Score Filter   │
│  ├─► Muse Wonder (Frame + Audit)    │ └─────────────────┬─────────────────┘
│  ├─► SAM 3.1 (Real Object Cutout)   │                   │
│  └─► Muse Image (Studio Showcase)   │                   ▼
└──────────────────┬──────────────────┘ ┌───────────────────────────────────┐
                   │                    │ GET /api/v1/marketplace/{id}      │
                   ▼                    │ (Deep Authenticity Inspection)    │
┌─────────────────────────────────────┐ │  ├─► Studio Showcase w/ Price Tag │
│ POST /api/v1/marketplace/publish    │ │  ├─► Real SAM 3.1 Cutout PNG      │
│  └─► Publishes extracted item(s)    │ │  ├─► SAM 3.1 HUD + Raw Room Frame │
│      under current User Account     │ │  └─► Muse Wonder 10-Pt Audit      │
│      into Marketplace Store         │ └─────────────────┬─────────────────┘
└─────────────────────────────────────┘                   │
                                                          ▼
                                        ┌───────────────────────────────────┐
                                        │ POST /api/v1/marketplace/{id}/buy │
                                        │  └─► Buyer purchases item         │
                                        │  └─► Updates Seller & Buyer       │
                                        │      wallets & order history      │
                                        └───────────────────────────────────┘