#!/usr/bin/env node
// Retired. CampusCode has exactly one administrator, claimed once through the setup flow at /ccadmingo
// by a verified Google account presenting a one-time owner-minted setup token (public.claim_initial_admin(token)).
// Roles can no longer be granted by script,
// SQL helper or dashboard. To transfer the administrator after the slot is claimed (owner action, SQL editor):
//   delete from public.user_roles where role = 'admin';
//   delete from public.admin_identity;
//   select private.issue_admin_setup_token();   -- one-time token for the new administrator only
console.error("Retired: the administrator is claimed once at /ccadmingo (see README → Administrator).");
process.exit(1);
