/**
 * CONF-D-003 / ISS-12 — in-product DPDP data-subject controls.
 *
 * The backend has exposed /privacy/export and /privacy/delete for a while, but no
 * UI ever called them. LegalPage described the rights in prose, so a data
 * principal could read that they had a right of access and erasure and still had
 * no way to exercise either. Under the DPDP Act (enforcement 2027-05-13) that is
 * the gap that matters — the capability existed, the reachability did not.
 *
 * Deletion is irreversible, so it is deliberately awkward: an explicit two-step
 * confirm, not a single click. Export is one click because it is non-destructive.
 */
import { useState } from 'react';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportMyData, deleteMyData, downloadExport } from '../lib/privacyApi';

export default function PrivacyControls({ compact = false }) {
    const { accessToken, isAuthenticated, signOut } = useAuth();
    const [busy, setBusy] = useState(null);       // 'export' | 'delete' | null
    const [confirming, setConfirming] = useState(false);
    const [message, setMessage] = useState(null); // { kind: 'ok'|'err', text }

    // These act on the caller's own records and the backend derives the user from
    // the verified token, so there is nothing meaningful to show a signed-out user.
    if (!isAuthenticated) return null;

    const handleExport = async () => {
        setBusy('export');
        setMessage(null);
        try {
            const data = await exportMyData(accessToken);
            const name = downloadExport(data);
            setMessage({ kind: 'ok', text: `Downloaded ${name}` });
        } catch (e) {
            setMessage({ kind: 'err', text: e.message || 'Export failed.' });
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async () => {
        setBusy('delete');
        setMessage(null);
        try {
            await deleteMyData(accessToken);
            // The records are gone; staying signed in would show a phantom session.
            setMessage({ kind: 'ok', text: 'Your data has been deleted. Signing out…' });
            setTimeout(() => { signOut?.(); }, 1200);
        } catch (e) {
            setMessage({ kind: 'err', text: e.message || 'Deletion failed.' });
            setBusy(null);
            setConfirming(false);
        }
    };

    const btn = 'flex items-center gap-1.5 text-[10.5px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className={compact ? 'px-1 space-y-1.5' : 'space-y-2'}>
            {!compact && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Your data</p>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={busy !== null}
                    className={`${btn} text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100`}
                    title="Download everything we hold about you (JSON)"
                >
                    {busy === 'export'
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Download size={11} />}
                    Download my data
                </button>

                {!confirming ? (
                    <button
                        type="button"
                        onClick={() => { setConfirming(true); setMessage(null); }}
                        disabled={busy !== null}
                        className={`${btn} text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400`}
                        title="Permanently erase your account and data"
                    >
                        <Trash2 size={11} />
                        Delete my data
                    </button>
                ) : (
                    <span className="flex items-center gap-2 text-[10.5px]">
                        <span className="text-zinc-600 dark:text-zinc-300">Permanently delete?</span>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={busy !== null}
                            className={`${btn} font-semibold text-red-600 hover:text-red-700 dark:text-red-400`}
                        >
                            {busy === 'delete' && <Loader2 size={11} className="animate-spin" />}
                            Yes, delete
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            disabled={busy !== null}
                            className={`${btn} text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300`}
                        >
                            Cancel
                        </button>
                    </span>
                )}
            </div>

            {message && (
                <p
                    role="status"
                    className={`text-[10px] leading-snug ${
                        message.kind === 'err'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
