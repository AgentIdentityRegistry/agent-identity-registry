-- Seed data: 8 demo agents migrated from the lookup page mock data

INSERT INTO agents (air_id, name, description, creator_did, creator_name, creator_type, capabilities, security_certifications, transparency_open_source, transparency_code_repo, transparency_docs_url, verification_level, verified, status, created_at, updated_at) VALUES
('AIR-7F3K-M9JQ-X2PL', 'DataProcessor-v3', 'Enterprise-grade data processing and ETL agent for structured financial datasets. Handles batch transformations, anomaly detection, and compliance reporting across multiple data formats.', 'did:key:z6MkhaXgBZDvotDkL5257faWxcqV7aGHRH94JWr93gXgvjpq', 'DataTech Inc.', 'organization', '["data_processing","financial_analysis","anomaly_detection","compliance_reporting","ETL_pipelines"]', '["SOC2-Type2","ISO27001"]', 1, 'https://github.com/datatech/processor', 'https://docs.datatech.io/processor', 'enhanced', 1, 'active', '2025-11-15T08:23:42Z', '2026-03-15T14:22:01Z'),

('AIR-KX7R-M4NP-2FTQ', 'FinanceAdvisor-Pro', 'Institutional-grade financial analysis agent providing market research, portfolio optimization, and risk assessment. Certified for SOC2 Type II and ISO 27001 environments.', 'did:web:meridian-capital.com', 'Meridian Capital', 'organization', '["financial_analysis","portfolio_optimization","risk_assessment","market_research","report_generation"]', '["SOC2-Type2","ISO27001"]', 1, 'https://github.com/meridian/finance-advisor', 'https://docs.meridian-capital.com/advisor', 'enhanced', 1, 'active', '2025-09-22T10:15:00Z', '2026-03-12T09:30:00Z'),

('AIR-9D2T-PN5W-Q8LR', 'CustomerAssist-v2', 'Multi-channel customer service agent handling support tickets, FAQ responses, and escalation routing. Deployed across 12 enterprise clients with documented SLA compliance.', 'did:web:helixai.io', 'HelixAI', 'organization', '["customer_support","ticket_routing","FAQ_generation","sentiment_analysis","escalation_management"]', '["SOC2-Type2"]', 1, 'https://github.com/helixai/customer-assist', 'https://docs.helixai.io/assist', 'standard', 1, 'active', '2025-12-03T14:00:00Z', '2026-03-10T11:45:00Z'),

('AIR-3V8F-RK6N-Y1MH', 'ContentForge-AI', 'Content generation agent for marketing teams. Produces blog posts, social media copy, and email campaigns with brand voice calibration and SEO optimization.', 'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2', 'ContentForge Labs', 'organization', '["content_generation","SEO_optimization","brand_voice_calibration","social_media","email_marketing"]', '[]', 0, '', 'https://contentforge.ai/docs', 'basic', 1, 'active', '2026-01-18T16:30:00Z', '2026-03-08T08:20:00Z'),

('AIR-QW4P-JC2X-T7BN', 'CodeReview-Bot', 'Automated code review agent for GitHub and GitLab integrations. Performs static analysis, security vulnerability scanning, and best-practice suggestions on pull requests.', 'did:web:devtools-collective.org', 'DevTools Collective', 'organization', '["code_review","static_analysis","security_scanning","best_practices","CI_CD_integration"]', '[]', 1, 'https://github.com/devtools-collective/codereview-bot', 'https://devtools-collective.org/docs/codereview', 'standard', 1, 'active', '2026-02-05T09:00:00Z', '2026-03-18T15:10:00Z'),

('AIR-H5LM-WR3D-K9VF', 'SocialPulse-Agent', 'Social media monitoring and engagement agent. Tracks brand mentions, schedules posts, and generates engagement analytics across major platforms.', 'did:key:z6MkvWk4x5V7NsWh6GYifJxRiT9t3jD8qP5ZpKLmFYq2MwQP', 'SocialPulse', 'individual', '["social_monitoring","post_scheduling","engagement_analytics","brand_tracking"]', '[]', 0, '', '', 'basic', 1, 'active', '2026-02-20T12:00:00Z', '2026-03-14T10:00:00Z'),

('AIR-N8YG-FP4S-L2QJ', 'TranslateBot-Beta', 'Newly registered multi-language translation agent currently in beta testing. Supports 24 languages with context-aware translation for technical documentation.', 'did:key:z6MkpJZvhNSrDNfXaG93StiPfqBXQ1ASrVah7iQdMZs8VKBp', 'LinguaTech', 'individual', '["translation","language_detection","technical_documentation","context_analysis"]', '[]', 0, '', '', 'self-verified', 1, 'active', '2026-03-10T08:00:00Z', '2026-03-17T14:00:00Z'),

('AIR-6CTX-BW9E-M3RK', 'UnknownAgent-x47', 'Unverified agent with minimal registration information. No creator verification completed. Limited operational history available in the registry.', 'did:key:z6MkUnverified000000000000000000000000000000000000', '', 'individual', '["unknown"]', '[]', 0, '', '', 'self-verified', 0, 'active', '2026-03-18T12:00:00Z', '2026-03-18T12:00:00Z');

-- Trust scores for all seed agents
INSERT INTO trust_scores (air_id, total_score, grade, provenance, behavioral, transparency, security, peer_attestations, calculated_at) VALUES
('AIR-7F3K-M9JQ-X2PL', 942, 'AAA', 960, 935, 950, 920, 940, '2026-03-15T14:22:01Z'),
('AIR-KX7R-M4NP-2FTQ', 887, 'AA', 910, 870, 895, 905, 855, '2026-03-12T09:30:00Z'),
('AIR-9D2T-PN5W-Q8LR', 781, 'A', 810, 795, 770, 720, 790, '2026-03-10T11:45:00Z'),
('AIR-3V8F-RK6N-Y1MH', 654, 'BBB', 680, 690, 620, 610, 640, '2026-03-08T08:20:00Z'),
('AIR-QW4P-JC2X-T7BN', 723, 'A', 750, 740, 760, 680, 680, '2026-03-18T15:10:00Z'),
('AIR-H5LM-WR3D-K9VF', 512, 'BB', 550, 520, 480, 490, 530, '2026-03-14T10:00:00Z'),
('AIR-N8YG-FP4S-L2QJ', 438, 'B', 460, 410, 490, 420, 380, '2026-03-17T14:00:00Z'),
('AIR-6CTX-BW9E-M3RK', 215, 'C', 180, 200, 250, 220, 190, '2026-03-18T12:00:00Z');

-- did:wba demo agents (added 2026-05-24 for build plan v2 Steps 5-7).
-- These exercise the new code paths:
--   WBA1 = external did:wba creator (caller controls demo.example.com)
--   WBA2 = AIR-minted did:wba (keyless agent, AIR hosts the DID document)
-- Both have deterministic Ed25519 public keys derived from SHA-256 of stable
-- seed strings (AIR-DEMO-KEY-1 / AIR-DEMO-KEY-2), so re-seeding is reproducible.
INSERT INTO agents (air_id, name, description, creator_did, creator_name, creator_type, capabilities, security_certifications, transparency_open_source, transparency_code_repo, transparency_docs_url, verification_level, verified, status, created_at, updated_at, is_demo, public_key, agent_secret_hash) VALUES
('AIR-WBA1-DEMO-AGT0', 'WeatherBot-Demo', 'Demo agent showcasing did:wba registration with an externally-owned domain DID. Resolves a public key for signature verification per W3C DID Core.', 'did:wba:demo.example.com:agents:weather', 'Demo Weather Inc.', 'organization', '["weather_forecasting","climate_data","timeseries_analysis"]', '[]', 1, 'https://github.com/example/weather-demo', 'https://demo.example.com/docs', 'standard', 1, 'active', '2026-05-24T12:00:00Z', '2026-05-24T12:00:00Z', 1, 'jri4LrCvVzBHx5LnOFxjvVlQd-PecJSS9BR_EhrPbsQ', NULL),
('AIR-WBA2-DEMO-AGT0', 'NotaryBot-Demo', 'Demo agent showcasing AIR-issued did:wba (keyless registration). The agent had no domain, so AIR hosts its DID document directly.', 'did:wba:agentidentityregistry.org:agents:AIR-WBA2-DEMO-AGT0', 'Notary Demo Co.', 'individual', '["attestation_signing","timestamp_authority","hash_chain_witness"]', '[]', 1, '', '', 'standard', 1, 'active', '2026-05-24T12:00:00Z', '2026-05-24T12:00:00Z', 1, 'NNoZWjFbrZnITLRY8O_1Od1lH1z9opIxMOtcYF1QW4A', NULL);

INSERT INTO trust_scores (air_id, total_score, grade, provenance, behavioral, transparency, security, peer_attestations, calculated_at) VALUES
('AIR-WBA1-DEMO-AGT0', 712, 'A', 750, 720, 730, 650, 700, '2026-05-24T12:00:00Z'),
('AIR-WBA2-DEMO-AGT0', 645, 'BBB', 680, 660, 620, 580, 660, '2026-05-24T12:00:00Z');

-- Phase 3 Stage 3.0.1a — sample service_endpoints for the WBA1 demo agent.
-- Exercises the A2A discovery path: getDidDocument now appends this A2AInbox
-- entry on top of the hardcoded AIRTrustScore entry. Re-runnable; idempotent.
UPDATE agents
SET service_endpoints = '[{"id":"#a2a","type":"A2AInbox","serviceEndpoint":"https://relay.agentidentityregistry.org/inbox/AIR-WBA1-DEMO-AGT0"}]'
WHERE air_id = 'AIR-WBA1-DEMO-AGT0';
