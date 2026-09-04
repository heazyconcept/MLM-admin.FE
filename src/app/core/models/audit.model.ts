/** Raw audit item from GET /admin/audit or GET /admin/users/:id activityLog */
export interface AuditApiItem {
  id: string;
  action: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
  actorDisplayName?: string;
  targetUsername?: string;
  description?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

/** Normalized audit row for tables, drawers, and user activity tabs */
export interface AuditDisplayEntry {
  id: string;
  timestamp: string;
  actorDisplayName: string;
  targetUsername?: string;
  action: string;
  rawAction: string;
  entity: string;
  referenceId: string;
  description: string;
  ipAddress?: string;
  actorRoleLabel?: string;
  metadata?: Record<string, unknown>;
  relatedEntities?: string[];
}

export type AuditActorFilter = 'Super Admin' | 'Admin' | 'User' | 'System';

export function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function metadataString(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function resolveActorRoleLabel(metadata: Record<string, unknown>): AuditActorFilter {
  const roleLabel = metadataString(metadata, 'actorRoleLabel');
  if (roleLabel === 'Super Admin' || roleLabel === 'Admin' || roleLabel === 'User' || roleLabel === 'System') {
    return roleLabel;
  }

  const actorType = (metadataString(metadata, 'actorType') ?? 'USER').toUpperCase();
  if (actorType === 'SYSTEM') return 'System';
  if (actorType === 'ADMIN') return 'Admin';
  return 'User';
}

function resolveActorDisplayName(
  item: AuditApiItem,
  metadata: Record<string, unknown>,
  actorRoleLabel: AuditActorFilter
): string {
  const topLevel = item.actorDisplayName?.trim();
  if (topLevel) return topLevel;

  const fromMetadata = metadataString(metadata, 'actorDisplayName');
  if (fromMetadata) return fromMetadata;

  const fullName =
    metadataString(metadata, 'actorFullName') ??
    metadataString(metadata, 'fullName');
  if (fullName) {
    return actorRoleLabel === 'User' || actorRoleLabel === 'System'
      ? fullName
      : `${actorRoleLabel} ${fullName}`;
  }

  const username =
    metadataString(metadata, 'actorUsername') ??
    metadataString(metadata, 'username');
  if (username) {
    return actorRoleLabel === 'User' || actorRoleLabel === 'System'
      ? username
      : `${actorRoleLabel} ${username}`;
  }

  return actorRoleLabel;
}

function resolveTargetUsername(item: AuditApiItem, metadata: Record<string, unknown>): string | undefined {
  return (
    item.targetUsername?.trim() ||
    metadataString(metadata, 'targetUsername') ||
    metadataString(metadata, 'username') ||
    metadataString(metadata, 'email')
  );
}

function resolveDescription(
  item: AuditApiItem,
  metadata: Record<string, unknown>,
  formattedAction: string,
  targetUsername?: string
): string {
  const topLevel = item.description?.trim();
  if (topLevel) return topLevel;

  const fromMetadata = metadataString(metadata, 'description');
  if (fromMetadata) return fromMetadata;

  const parts: string[] = [formattedAction];
  if (targetUsername) {
    parts.push(`for @${targetUsername.replace(/^@/, '')}`);
  }
  return parts.join(' ');
}

function resolveIpAddress(item: AuditApiItem, metadata: Record<string, unknown>): string | undefined {
  return (
    item.ipAddress?.trim() ||
    metadataString(metadata, 'ipAddress') ||
    metadataString(metadata, 'ip')
  );
}

function resolveTimestamp(item: AuditApiItem, metadata: Record<string, unknown>): string {
  return metadataString(metadata, 'timestamp') ?? item.createdAt ?? new Date().toISOString();
}

export function mapAuditApiItem(item: AuditApiItem): AuditDisplayEntry {
  const metadata = item.metadata ?? {};
  const actorRoleLabel = resolveActorRoleLabel(metadata);
  const formattedAction = formatAuditAction(item.action);
  const targetUsername = resolveTargetUsername(item, metadata);

  return {
    id: item.id,
    timestamp: resolveTimestamp(item, metadata),
    actorDisplayName: resolveActorDisplayName(item, metadata, actorRoleLabel),
    targetUsername,
    action: formattedAction,
    rawAction: item.action,
    entity: item.entityType ?? '—',
    referenceId: item.entityId ?? '—',
    description: resolveDescription(item, metadata, formattedAction, targetUsername),
    ipAddress: resolveIpAddress(item, metadata),
    actorRoleLabel,
    metadata,
    relatedEntities: [item.entityId, item.actorId].filter((value): value is string => Boolean(value)),
  };
}

export function formatAuditTimestamp(timestamp: string): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
