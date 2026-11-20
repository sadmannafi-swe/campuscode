#!/usr/bin/env node
// Retired. CampusCode has exactly one administrator, claimed once through the setup flow at /ccadmingo
// by a verified Google account (public.claim_initial_admin). Roles can no longer be granted by script,
// SQL helper or dashboard. To transfer the administrator after the slot is claimed (owner action, SQL editor):
//   delete from public.user_roles where role = 'admin';
//   delete from public.admin_identity;          -- reopens /ccadmingo setup for the next verified Google account
console.error("Retired: the administrator is claimed once at /ccadmingo (see README → Administrator).");
process.exit(1);
