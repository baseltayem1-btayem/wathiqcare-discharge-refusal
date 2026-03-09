# Performance Test Report

Date: 2026-03-09
Evidence source: `docs/test_documents/performance_probe_result.json`, `perf_latency_samples.txt`

## Test Profile
- Cases created for load probe: 100
- Concurrent API users simulated: 20
- Target documents in probe logic: 300

## Observed Metrics
- Average API latency: 0.7583 seconds
- Peak API latency: 0.9940 seconds
- Uvicorn RSS before: 87740 KB
- Uvicorn RSS after: 94268 KB
- Memory delta: +6528 KB

## Functional Throughput Notes
- Case creation throughput: PASS (100 created)
- Workflow-generated document success in probe: 0/300
- Reason: precondition order in scripted workflow path prevented document generation API success during stress run.

## Assessment
- API latency and memory profile are stable for internal pilot levels.
- Business workflow sequencing in load scripts must be corrected to measure end-to-end document throughput accurately.

## Required Follow-up
- Update performance script with valid workflow order and re-run target document generation KPI.
- Add percentile reporting (`p50`, `p95`, `p99`) for launch dashboard tracking.
