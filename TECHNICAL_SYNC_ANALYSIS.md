# Technical Analysis: Pot Syncing Issue

## Current Architecture

### Data Storage Layer

**1. Client-Side Storage (Primary)**
- **Location**: Browser `localStorage`
- **Key**: `chopdot_pots` (JSON array)
- **Format**: In-memory React state (`useState<Pot[]>`)
- **Persistence**: Write-through to localStorage on changes
- **Size Limit**: 1MB per key (with backup fallback)

```typescript
// Current flow:
User Action → React State Update → localStorage.setItem()
```

**2. IPFS Storage (Secondary/Backup)**
- **Purpose**: Sharing and backup only
- **Format**: Immutable JSON snapshots
- **Upload**: Via Crust Network gateway (`gw.crustfiles.app/api/v0`)
- **Authentication**: Wallet-based (Web3Auth token format)
- **Read**: Via public IPFS gateways (`ipfs.io`, `gateway.pinata.cloud`, etc.)

```typescript
// Sharing flow:
Pot → JSON.stringify() → IPFS Upload → CID → Shareable Link
```

**3. Database Schema (Designed but Not Used)**
- PostgreSQL/SQLite schema exists (`pots`, `pot_members`, `expenses` tables)
- **Status**: Schema defined but not actively used for sync
- **Purpose**: Designed for future centralized sync

### Current Data Flow

#### Sharing a Pot
```
1. User clicks "Share Pot"
   ↓
2. Pot serialized to JSON
   {
     potId: "123",
     name: "Trip to Paris",
     members: [...],
     expenses: [...],
     updatedAt: "2024-01-01T12:00:00Z"
   }
   ↓
3. Uploaded to IPFS via Crust gateway
   - Requires wallet signature (one-time auth)
   - Returns CID: QmABC123...
   ↓
4. Shareable link generated
   http://localhost:5173/import-pot?cid=QmABC123...
```

#### Importing a Pot
```
1. User opens share link
   ↓
2. Extract CID from URL
   ↓
3. Fetch from IPFS gateway
   GET https://ipfs.io/ipfs/QmABC123...
   ↓
4. Parse JSON snapshot
   ↓
5. Add to local pots array
   setPots([...pots, importedPot])
   ↓
6. Save to localStorage
   localStorage.setItem('chopdot_pots', JSON.stringify(pots))
```

## The Syncing Problem

### Why Sync Doesn't Work

**1. IPFS Immutability**
- IPFS uses Content-Addressed Storage (CAS)
- Each CID is a hash of the content
- Changing content = new CID
- **Result**: Each upload creates a new snapshot, not an update

**2. No Central Coordination**
- Each user has independent `localStorage`
- No server to coordinate changes
- No shared state between users
- **Result**: Changes are isolated per user

**3. No Update Mechanism**
- IPFS snapshots are read-only
- No way to "update" an existing CID
- No event system to notify of changes
- **Result**: Users can't see each other's changes

### Technical Flow Breakdown

#### Scenario: Alice and Bob Share a Pot

**Initial State:**
```
Alice's localStorage:
  pots: [{ id: "pot-1", name: "Trip", expenses: [] }]

Bob's localStorage:
  pots: []
```

**Step 1: Alice Shares**
```
Alice:
  1. Uploads pot-1 to IPFS → CID: QmABC123
  2. Gets link: /import-pot?cid=QmABC123
  3. Shares link with Bob
```

**Step 2: Bob Imports**
```
Bob:
  1. Opens link
  2. Fetches QmABC123 from IPFS
  3. Gets snapshot: { id: "pot-1", expenses: [] }
  4. Adds to his localStorage
  5. Now has: pots: [{ id: "pot-1", expenses: [] }]
```

**Step 3: Bob Adds Expense**
```
Bob:
  1. Adds expense: { id: "exp-1", amount: 50 }
  2. Updates local pot: { id: "pot-1", expenses: [exp-1] }
  3. Saves to localStorage
  4. ✅ Bob sees the expense
  5. ❌ Alice doesn't see it (still has old snapshot)
```

**Step 4: Alice Adds Expense**
```
Alice:
  1. Adds expense: { id: "exp-2", amount: 30 }
  2. Updates local pot: { id: "pot-1", expenses: [exp-2] }
  3. Saves to localStorage
  4. ✅ Alice sees exp-2
  5. ❌ Bob doesn't see it (still has exp-1)
```

**Result:**
```
Alice's view: { expenses: [exp-2] }      // Missing exp-1
Bob's view:   { expenses: [exp-1] }      // Missing exp-2
Reality:      { expenses: [exp-1, exp-2] }  // Neither sees this!
```

## Technical Challenges

### 1. Conflict Resolution
**Problem**: What if Alice and Bob both add expenses simultaneously?
- Alice adds expense at 12:00:00
- Bob adds expense at 12:00:01
- Both think they're correct
- **Need**: Merge strategy (last-write-wins? timestamp-based? CRDT?)

### 2. Ordering/Sequencing
**Problem**: How to ensure events are processed in order?
- Expense A added before Expense B
- But Bob receives B before A
- **Need**: Vector clocks, Lamport timestamps, or sequence numbers

### 3. State Convergence
**Problem**: How to ensure all users eventually see the same state?
- Alice has version 1
- Bob has version 2
- Charlie has version 3
- **Need**: Event sourcing, operational transforms, or CRDTs

### 4. Network Partitions
**Problem**: What if users are offline?
- Alice adds expense offline
- Bob adds expense offline
- Both come online
- **Need**: Offline-first sync with conflict resolution

### 5. Performance
**Problem**: Fetching entire pot on every change is expensive
- Pot with 1000 expenses = large JSON
- Every change = full re-upload
- **Need**: Incremental updates (deltas/patches)

## Why This Matters

### User Experience Impact
1. **Broken Collaboration**: Users expect real-time sync (like Google Docs, Splitwise)
2. **Data Integrity**: Incorrect balances lead to wrong settlements
3. **Trust Issues**: Users lose confidence when data doesn't match
4. **Adoption Barrier**: Without sync, app isn't useful for group expenses

### Business Impact
1. **Competitive Disadvantage**: Splitwise/Tricount have real-time sync
2. **User Retention**: Users will switch if sync doesn't work
3. **Feature Completeness**: Core feature is incomplete
4. **Scalability**: Current approach doesn't scale beyond single-user

## Potential Solutions

### Option 1: Centralized Server (Like Splitwise)
**Architecture:**
```
Client → Backend API → PostgreSQL → WebSocket → All Clients
```

**Pros:**
- ✅ Real-time sync via WebSockets
- ✅ Conflict resolution on server
- ✅ Proven approach (Splitwise, Tricount)
- ✅ Simple to implement

**Cons:**
- ❌ Centralized (not decentralized)
- ❌ Requires server infrastructure
- ❌ Single point of failure
- ❌ Ongoing server costs

**Implementation:**
- Use existing PostgreSQL schema
- Add WebSocket server (Socket.io, ws)
- Client sends changes → Server → Broadcast to all members
- Conflict resolution: Last-write-wins or timestamp-based

### Option 2: Decentralized Sync (IPNS + Event Log)
**Architecture:**
```
Client → IPNS (mutable pointer) → IPFS (immutable events)
```

**How it works:**
- Use IPNS (InterPlanetary Name System) for mutable pointer
- Store events (not full state) on IPFS
- Each change = new event CID
- IPNS points to latest event log CID
- Clients poll IPNS for updates

**Pros:**
- ✅ Decentralized (no server)
- ✅ Uses existing IPFS infrastructure
- ✅ Immutable event log (audit trail)

**Cons:**
- ❌ IPNS is slow (can take minutes)
- ❌ Complex conflict resolution
- ❌ Requires event sourcing architecture
- ❌ Not real-time (polling-based)

**Implementation:**
- Create event log: `[{type: 'ADD_EXPENSE', data: {...}, timestamp, author}]`
- Upload events to IPFS
- Update IPNS pointer to latest event log CID
- Clients poll IPNS every 30 seconds
- Replay events to reconstruct state

### Option 3: Hybrid Approach (IPFS + Lightweight Server)
**Architecture:**
```
Client → Lightweight Sync Server → IPFS (for storage)
         ↓
    WebSocket (for real-time)
```

**How it works:**
- Server coordinates sync (WebSocket)
- IPFS stores actual data (decentralized)
- Server maintains "sync log" (who changed what)
- Clients fetch from IPFS, sync via server

**Pros:**
- ✅ Real-time sync (WebSocket)
- ✅ Decentralized storage (IPFS)
- ✅ Best of both worlds

**Cons:**
- ❌ Still requires server (but lightweight)
- ❌ More complex architecture
- ❌ Two systems to maintain

**Implementation:**
- Server: Node.js + WebSocket + Redis (for sync state)
- Client: Upload changes to IPFS → Notify server → Server broadcasts CID
- Other clients: Receive CID → Fetch from IPFS → Merge changes

### Option 4: Blockchain-Based (Polkadot)
**Architecture:**
```
Client → Polkadot Chain → On-chain Events → All Clients
```

**How it works:**
- Store pot changes as on-chain events (extrinsics)
- Use Polkadot's consensus for ordering
- Clients subscribe to chain events
- Reconstruct state from events

**Pros:**
- ✅ Fully decentralized
- ✅ Immutable audit trail
- ✅ Built-in consensus (no conflicts)
- ✅ Aligns with Polkadot ecosystem

**Cons:**
- ❌ Expensive (transaction fees)
- ❌ Slow (block time ~6 seconds)
- ❌ Complex (requires smart contract or runtime)
- ❌ Not suitable for frequent updates

**Implementation:**
- Create Polkadot pallet for pot events
- Each change = extrinsic on chain
- Clients subscribe via RPC
- Replay events to get current state

### Option 5: CRDT (Conflict-Free Replicated Data Types)
**Architecture:**
```
Client → CRDT Algorithm → Merge Changes → Sync via IPFS/Server
```

**How it works:**
- Use CRDT data structures (LWW-Register, OR-Set, etc.)
- Changes automatically merge without conflicts
- Sync via any transport (IPFS, server, P2P)

**Pros:**
- ✅ No conflicts (mathematically proven)
- ✅ Works offline
- ✅ Can use IPFS for transport
- ✅ Decentralized-friendly

**Cons:**
- ❌ Complex to implement
- ❌ Requires rewriting data structures
- ❌ Can be memory-intensive
- ❌ Learning curve

**Implementation:**
- Use libraries like `automerge` or `yjs`
- Convert pot structure to CRDT
- Sync CRDT operations via IPFS or server
- Automatic merge on all clients

## Recommended Approach

### Phase 1: Quick Win (Centralized Server)
**Timeline**: 2-4 weeks
**Why**: Fastest path to working sync
- Use existing PostgreSQL schema
- Add WebSocket server
- Implement last-write-wins conflict resolution
- **Result**: Real-time sync working

### Phase 2: Decentralize Storage (Hybrid)
**Timeline**: 4-8 weeks
**Why**: Keep IPFS benefits, add sync
- Keep IPFS for storage
- Add lightweight sync server
- Server coordinates, IPFS stores
- **Result**: Decentralized storage + real-time sync

### Phase 3: Full Decentralization (Future)
**Timeline**: 3-6 months
**Why**: True decentralization
- Evaluate IPNS, CRDTs, or blockchain
- Based on Phase 2 learnings
- **Result**: Fully decentralized sync

## Current Codebase Status

### What Exists
- ✅ IPFS upload/download (`src/services/storage/ipfs.ts`)
- ✅ Pot sharing (`src/services/sharing/potShare.ts`)
- ✅ Auto-backup (`src/services/backup/autoBackup.ts`)
- ✅ Database schema (`src/database/init/01-schema.sql`)
- ✅ LocalStorage persistence (`src/services/data/sources/LocalStorageSource.ts`)

### What's Missing
- ❌ Sync server (WebSocket or HTTP polling)
- ❌ Conflict resolution logic
- ❌ Event/change tracking
- ❌ Multi-user coordination
- ❌ Real-time updates

### What Needs to Change
1. **Data Model**: Add `version`, `lastModifiedBy`, `changeLog`
2. **Sync Layer**: Add sync service (server or P2P)
3. **Conflict Resolution**: Implement merge strategy
4. **UI**: Add sync status indicators
5. **Testing**: Multi-user sync scenarios

## Conclusion

**Current State**: 
- ✅ Sharing works (IPFS snapshots)
- ✅ Import works (fetch from IPFS)
- ❌ Sync doesn't work (no coordination)

**Root Cause**: 
- IPFS immutability + no central coordination = isolated copies

**Solution Required**: 
- Add coordination layer (server, IPNS, or blockchain)
- Implement conflict resolution
- Add real-time or polling-based updates

**Priority**: 
- **HIGH** - Core feature is incomplete
- Users expect real-time sync
- Competitive requirement

**Next Steps**:
1. Decide on sync approach (recommend: Centralized server first)
2. Design sync protocol (events, versioning, conflicts)
3. Implement sync server (WebSocket + PostgreSQL)
4. Update client to use sync service
5. Test multi-user scenarios

