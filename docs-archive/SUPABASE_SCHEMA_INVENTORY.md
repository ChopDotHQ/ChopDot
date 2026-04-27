# Supabase Schema Inventory

Complete reference document for the ChopDot Supabase database schema, including tables, columns, relationships, policies, functions, and triggers.

## Table of Contents

1. [Complete Table & Column Inventory](#complete-table--column-inventory)
2. [Foreign Key Relationships](#foreign-key-relationships)
3. [Column Defaults](#column-defaults)
4. [Row-Level Security Policies](#row-level-security-policies)
5. [Table Row Security Settings](#table-row-security-settings)
6. [Functions & Routines](#functions--routines)
7. [Triggers](#triggers)

---

## Complete Table & Column Inventory

| Table Name | Column Name | Data Type | Is Nullable |
|------------|-------------|-----------|-------------|
| **contributions** | | | |
| | id | uuid | NO |
| | expense_id | uuid | NO |
| | member_id | uuid | NO |
| | share_minor | bigint | NO |
| | paid | boolean | NO |
| | created_at | timestamp with time zone | NO |
| **crdt_changes** | | | |
| | id | uuid | NO |
| | pot_id | uuid | NO |
| | change_data | bytea | NO |
| | hash | text | NO |
| | actor | text | NO |
| | seq | integer | NO |
| | user_id | uuid | NO |
| | created_at | timestamp with time zone | YES |
| **crdt_checkpoints** | | | |
| | id | uuid | NO |
| | pot_id | uuid | NO |
| | document_data | bytea | NO |
| | heads | ARRAY | NO |
| | change_count | integer | NO |
| | created_at | timestamp with time zone | YES |
| | created_by | uuid | NO |
| **expenses** | | | |
| | id | uuid | NO |
| | pot_id | uuid | NO |
| | creator_id | uuid | NO |
| | amount_minor | bigint | NO |
| | currency_code | text | NO |
| | description | text | YES |
| | receipt_path | text | YES |
| | receipt_thumb_path | text | YES |
| | receipt_size | integer | YES |
| | created_at | timestamp with time zone | NO |
| **payments** | | | |
| | id | uuid | NO |
| | settlement_id | uuid | NO |
| | method | text | NO |
| | reference | text | YES |
| | created_at | timestamp with time zone | NO |
| **pot_members** | | | |
| | id | uuid | NO |
| | pot_id | uuid | NO |
| | user_id | uuid | NO |
| | role | character varying | NO |
| | status | character varying | NO |
| | joined_at | timestamp with time zone | YES |
| **pots** | | | |
| | id | uuid | NO |
| | name | character varying | NO |
| | created_by | uuid | NO |
| | created_at | timestamp with time zone | YES |
| | updated_at | timestamp with time zone | YES |
| | archived_at | timestamp with time zone | YES |
| | automerge_heads | ARRAY | YES |
| | last_synced_at | timestamp with time zone | YES |
| **profiles** | | | |
| | id | uuid | NO |
| | username | text | YES |
| | created_at | timestamp with time zone | NO |
| | updated_at | timestamp with time zone | NO |
| **receipts** | | | |
| | id | uuid | NO |
| | pot_id | uuid | NO |
| | expense_id | character varying | NO |
| | cid | character varying | NO |
| | filename | character varying | YES |
| | mime_type | character varying | YES |
| | size_bytes | integer | YES |
| | uploaded_by | uuid | NO |
| | uploaded_at | timestamp with time zone | YES |
| **settlements** | | | |
| | id | uuid | NO |
| | pot_id | uuid | NO |
| | from_member_id | uuid | NO |
| | to_member_id | uuid | NO |
| | amount_minor | bigint | NO |
| | currency_code | text | NO |
| | status | text | NO |
| | tx_hash | text | YES |
| | confirmations | integer | NO |
| | last_checked_at | timestamp with time zone | YES |
| | created_at | timestamp with time zone | NO |
| **wallet_links** | | | |
| | id | uuid | NO |
| | user_id | uuid | NO |
| | chain | text | NO |
| | address | text | NO |
| | provider | text | NO |
| | verified_at | timestamp with time zone | YES |
| | created_at | timestamp with time zone | NO |
| | updated_at | timestamp with time zone | NO |

---

## Foreign Key Relationships

| Child Table | Child Column | Parent Table | Parent Column |
|-------------|--------------|---------------|---------------|
| contributions | expense_id | expenses | id |
| pot_members | pot_id | pots | id |
| pot_members | user_id | users | id |
| pots | created_by | users | id |
| receipts | pot_id | pots | id |
| receipts | uploaded_by | users | id |

---

## Column Defaults

| Table Name | Column Name | Default Value |
|------------|-------------|---------------|
| contributions | id | gen_random_uuid() |
| contributions | paid | false |
| contributions | created_at | now() |
| expenses | id | gen_random_uuid() |
| expenses | currency_code | 'DOT'::text |
| expenses | created_at | now() |
| pot_members | id | uuid_generate_v4() |
| pot_members | role | 'member'::character varying |
| pot_members | status | 'active'::character varying |
| pot_members | joined_at | CURRENT_TIMESTAMP |
| pots | id | uuid_generate_v4() |
| pots | created_at | CURRENT_TIMESTAMP |
| pots | updated_at | CURRENT_TIMESTAMP |
| pots | last_synced_at | CURRENT_TIMESTAMP |
| receipts | id | uuid_generate_v4() |
| receipts | uploaded_at | CURRENT_TIMESTAMP |
| settlements | id | gen_random_uuid() |
| settlements | currency_code | 'DOT'::text |
| settlements | status | 'pending'::text |
| settlements | confirmations | 0 |
| settlements | created_at | now() |

---

## Row-Level Security Policies

| Schema | Table | Policy Name | Permissive | Roles | Command | Qual | With Check |
|--------|-------|-------------|------------|-------|---------|------|------------|
| public | pot_members | Pot owners can manage members | PERMISSIVE | {public} | ALL | `(EXISTS ( SELECT 1 FROM pot_members pm WHERE ((pm.pot_id = pot_members.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.role)::text = 'owner'::text))))` | null |
| public | pot_members | Users can read pot members if they are a member | PERMISSIVE | {public} | SELECT | `(EXISTS ( SELECT 1 FROM pot_members pm WHERE ((pm.pot_id = pot_members.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))` | null |
| public | pots | Pot owners can update pots | PERMISSIVE | {public} | UPDATE | `(EXISTS ( SELECT 1 FROM pot_members WHERE ((pot_members.pot_id = pots.id) AND (pot_members.user_id = auth.uid()) AND ((pot_members.role)::text = 'owner'::text))))` | null |
| public | pots | Users can create pots | PERMISSIVE | {public} | INSERT | null | `(auth.uid() = created_by)` |
| public | pots | Users can read pots they are members of | PERMISSIVE | {public} | SELECT | `(EXISTS ( SELECT 1 FROM pot_members WHERE ((pot_members.pot_id = pots.id) AND (pot_members.user_id = auth.uid()) AND ((pot_members.status)::text = 'active'::text))))` | null |
| public | receipts | Members can read receipts | PERMISSIVE | {public} | SELECT | `(EXISTS ( SELECT 1 FROM pot_members WHERE ((pot_members.pot_id = receipts.pot_id) AND (pot_members.user_id = auth.uid()) AND ((pot_members.status)::text = 'active'::text))))` | null |
| public | receipts | Members can upload receipts | PERMISSIVE | {public} | INSERT | null | `((auth.uid() = uploaded_by) AND (EXISTS ( SELECT 1 FROM pot_members WHERE ((pot_members.pot_id = receipts.pot_id) AND (pot_members.user_id = auth.uid()) AND ((pot_members.status)::text = 'active'::text)))))` |

### Policy Summary

**pot_members:**
- Owners can manage (ALL operations) members of their pots
- Active members can read pot members

**pots:**
- Owners can update pots
- Users can create pots (must be the creator)
- Active members can read pots they belong to

**receipts:**
- Active members can read receipts for their pots
- Active members can upload receipts (must be the uploader)

---

## Table Row Security Settings

| Schema | Table | Row Security Enabled | Force Row Security |
|--------|-------|---------------------|-------------------|
| public | contributions | false | false |
| public | expenses | false | false |
| public | pot_members | **true** | false |
| public | pots | **true** | false |
| public | profiles | false | false |
| public | receipts | **true** | false |
| public | settlements | false | false |
| public | wallet_links | false | false |

**Note:** Tables with Row Security enabled (`pot_members`, `pots`, `receipts`) require RLS policies for access. Other tables are accessible without RLS restrictions.

---

## Functions & Routines

| Routine Name | Routine Type | Return Data Type | Description |
|--------------|-------------|------------------|-------------|
| cleanup_old_crdt_changes | FUNCTION | void | Cleans up old CRDT changes, keeping only the most recent 1000 per pot |
| get_pot_members | FUNCTION | record | Returns table of pot members (user_id, role, status) for a given pot UUID |
| is_pot_member | FUNCTION | boolean | Checks if a user is a member of a pot |
| set_updated_at | FUNCTION | trigger | Trigger function to set updated_at timestamp |
| update_updated_at_column | FUNCTION | trigger | Trigger function to update updated_at column |

---

## Triggers

| Table Name | Trigger Name | Action Timing | Event Manipulation | Action Statement |
|------------|--------------|---------------|-------------------|------------------|
| pots | update_pots_updated_at | BEFORE | UPDATE | EXECUTE FUNCTION update_updated_at_column() |

**Description:** Automatically updates the `updated_at` timestamp on the `pots` table whenever a row is updated.

---

## Schema Notes

### CRDT Tables
- **crdt_changes**: Stores incremental changes for CRDT synchronization
- **crdt_checkpoints**: Stores full document snapshots for faster initial sync

### Core Tables
- **pots**: Main expense splitting groups
- **pot_members**: Many-to-many relationship between users and pots
- **expenses**: Individual expenses within pots
- **contributions**: How expenses are split among members
- **settlements**: On-chain settlement transactions
- **payments**: Payment records linked to settlements

### Supporting Tables
- **profiles**: User profile information
- **receipts**: IPFS-stored receipt files
- **wallet_links**: Blockchain wallet addresses linked to users

### Security Model
- Row-Level Security (RLS) is enabled on `pot_members`, `pots`, and `receipts`
- Access is controlled through membership checks using `auth.uid()`
- Owners have elevated permissions (can manage members, update pots)
- Active members can read data, upload receipts

### Default Values
- UUIDs are auto-generated for primary keys
- Timestamps default to current time
- Currency defaults to 'DOT'
- Member role defaults to 'member', status to 'active'
- Settlement status defaults to 'pending'

---

## Integration Checklist

When integrating with Supabase:

- [ ] Ensure RLS policies are properly configured for your use case
- [ ] Use `auth.uid()` for user identification in queries
- [ ] Check pot membership before accessing pot-related data
- [ ] Handle CRDT sync using `crdt_changes` and `crdt_checkpoints` tables
- [ ] Use the provided functions (`get_pot_members`, `is_pot_member`) for membership checks
- [ ] Respect the foreign key relationships when inserting data
- [ ] Use default values appropriately (UUIDs, timestamps, etc.)
- [ ] Consider the `updated_at` trigger on pots table

---

*Last updated: November 2024*
*Schema version: Based on migration 20241113000001*

