import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const ownerOpenId = process.env.OWNER_OPEN_ID;

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!ownerOpenId) throw new Error("OWNER_OPEN_ID is required");

const connection = await mysql.createConnection({ uri: databaseUrl });
const now = Date.now();

try {
  await connection.beginTransaction();

  const [organizationResult] = await connection.execute(
    `INSERT INTO security_role_grants
      (user_id, role, scope_type, organization_id, granted_by_user_id, reason, granted_at)
     SELECT bp.userId, 'organization_owner', 'organization', bp.id, bp.userId,
       'Deterministic ownership backfill from business_profiles.userId', ?
     FROM business_profiles bp
     WHERE NOT EXISTS (
       SELECT 1 FROM security_role_grants existing
       WHERE existing.user_id = bp.userId
         AND existing.role = 'organization_owner'
         AND existing.scope_type = 'organization'
         AND existing.organization_id = bp.id
         AND existing.revoked_at IS NULL
         AND (existing.expires_at IS NULL OR existing.expires_at > ?)
     )`,
    [now, now],
  );

  const [ownerRows] = await connection.execute(
    "SELECT id FROM users WHERE openId = ? LIMIT 1",
    [ownerOpenId],
  );
  if (!Array.isArray(ownerRows) || ownerRows.length !== 1) {
    throw new Error("Configured application owner could not be resolved uniquely");
  }
  const ownerUserId = ownerRows[0].id;

  const [platformResult] = await connection.execute(
    `INSERT INTO security_role_grants
      (user_id, role, scope_type, organization_id, granted_by_user_id, reason, granted_at)
     SELECT ?, 'platform_owner', 'platform', NULL, ?,
       'Configured application owner backfill from OWNER_OPEN_ID', ?
     WHERE NOT EXISTS (
       SELECT 1 FROM security_role_grants existing
       WHERE existing.user_id = ?
         AND existing.role = 'platform_owner'
         AND existing.scope_type = 'platform'
         AND existing.organization_id IS NULL
         AND existing.revoked_at IS NULL
         AND (existing.expires_at IS NULL OR existing.expires_at > ?)
     )`,
    [ownerUserId, ownerUserId, now, ownerUserId, now],
  );

  await connection.commit();
  console.log(JSON.stringify({
    organizationOwnerGrantsAdded: Number(organizationResult.affectedRows ?? 0),
    platformOwnerGrantsAdded: Number(platformResult.affectedRows ?? 0),
  }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
