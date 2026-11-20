import {CheckCircleIcon, CloudArrowUpIcon, ExclamationTriangleIcon, SignalSlashIcon} from '@heroicons/react/24/outline';
import {useSyncStatus} from '../state/ProgressContext';

const TEXT = {
  idle: 'Saved on this phone',
  saving: 'Saving…',
  synced: 'Saved to the server',
  offline: "No internet — saved on this phone, it'll be sent later",
  error: "Couldn't save to the server — it'll try again",
} as const;

/** One quiet line: where the progress is right now. Static icon, no spinning. */
export function SyncStatusLine() {
  const status = useSyncStatus();
  const Icon = status === 'synced' ? CheckCircleIcon : status === 'offline' ? SignalSlashIcon : status === 'error' ? ExclamationTriangleIcon : CloudArrowUpIcon;
  return (
    <p className={`sync-status is-${status}`} role="status">
      <Icon className="sync-icon" aria-hidden="true" />
      <span>{TEXT[status]}</span>
    </p>
  );
}
