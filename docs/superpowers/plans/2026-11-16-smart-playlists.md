# Smart Playlists Implementation Plan

> **For Claude:** Use executing-plans / subagent-driven-development to implement task-by-task if still incomplete.

**Goal:** Ship deterministic history-based smart playlists for v0.3.9.

**Architecture:** Rules in `smart-playlists.json`; materializer upserts `config.playlists` with `smart-<id>` ids. Ink + immersive + CLI. No LLM.

**Tech Stack:** Bun, history/stats services, Ink, immersive library overlay, bun:test

See Cursor plan `smart_playlists_feature_cf2e189f.plan.md` for full task breakdown. This file is the repo-canonical copy under `docs/superpowers/plans/`.
