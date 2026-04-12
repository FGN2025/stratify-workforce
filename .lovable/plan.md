

## Plan: Insert All 12 FTS-CE Modules and Lessons

All 12 SQL blocks have been received for course `dab09852-eeb2-431f-b2f4-b881c6b4aa7f`. I'll execute them as a single database insert operation.

### Modules to insert (order_index 0–11):
1. **FTS-CE-01**: Utility Locating and Damage Prevention (0)
2. **FTS-CE-02**: Trenching, Conduit, and Underground Construction (1)
3. **FTS-CE-03**: Aerial Construction and Pole Line Engineering (2)
4. **FTS-CE-04**: Fiber Optic Technology Review — Field Edition (3)
5. **FTS-CE-05**: Directional Boring and Microtrenching Methods (4)
6. **FTS-CE-06**: OSP Handoff — From Construction to Completion (5)
7. **FTS-CE-07**: Fiber Cable Types and OSP Selection Logic (6)
8. **FTS-CE-08**: Fusion Splicing Principles and Closure Systems (7)
9. **FTS-CE-09**: Connector Types and OSP Termination Methods (8)
10. **FTS-CE-10**: Fiber Optic Testing Fundamentals (9)
11. **FTS-CE-11**: OTDR — Reading Traces and Diagnosing Faults (10)
12. **FTS-CE-12**: Network Design and Loss Budget Basics (11)

Each module gets one quiz lesson with 5 questions (80% passing score).

### Technical approach
- Use the database insert tool to run all 12 `WITH ... INSERT` blocks sequentially in a single SQL statement
- Note: Block 10 was sent twice — only one copy will be inserted

### Steps
1. Execute the combined SQL inserting all 12 modules and their quiz lessons
2. Verify the inserted data with a read query

