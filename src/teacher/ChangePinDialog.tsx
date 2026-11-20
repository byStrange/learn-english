import {useRef, useState} from 'react';
import {Button} from '@curialy/ui/Button';
import {Dialog, DialogHeader} from '@curialy/ui/Dialog';
import {useToast} from '@curialy/ui/Toast';
import {PinPad, type PinResult} from '../components/PinPad';

/** "Done" for the PinPad: the pad stops; the dialog moves to the next step itself. */
const accepted = (userId: string): PinResult => ({ok: true, token: '', userId, role: 'learner', trackId: null, expiresAt: ''});

/**
 * The teacher sets a new PIN: typed twice on the on-screen pad, then saved on
 * the server. The person is logged out on their phone and uses the new PIN.
 */
export function ChangePinDialog({userId, name, isTeacher = false, setPin}: {userId: string; name: string; isTeacher?: boolean; setPin: (userId: string, pin: string) => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const length = isTeacher ? 6 : 4;

  const close = () => {
    setOpen(false);
    setFirst(null);
    setRound(r => r + 1);
    trigger.current?.focus();
  };

  const submit = async (pin: string): Promise<PinResult> => {
    if (first === null) {
      setFirst(pin);
      setRound(r => r + 1);
      return accepted(userId);
    }
    if (pin !== first) {
      setFirst(null);
      setRound(r => r + 1);
      return {ok: false, reason: 'mismatch'};
    }
    try {
      await setPin(userId, pin);
    } catch (e) {
      return {ok: false, reason: 'error', message: e instanceof Error ? `Couldn't save: ${e.message}` : "Couldn't save the PIN. Try again."};
    }
    toast({body: `New PIN saved for ${name}`, uniqueID: `pin-${userId}`});
    close();
    return accepted(userId);
  };

  return (
    <>
      <Button ref={trigger} label="Change PIN" variant="secondary" onClick={() => setOpen(true)} />
      <Dialog isOpen={open} onOpenChange={o => (o ? setOpen(true) : close())} purpose="form" width={400}>
        <DialogHeader title={`New PIN for ${name}`} subtitle={first === null ? `Type ${length} digits` : 'Type it again to check'} onOpenChange={o => (o ? null : close())} />
        <div className="pin-dialog-body">
          <PinPad key={round} length={length} label={first === null ? `New PIN for ${name}` : `New PIN for ${name}, again`} onSubmit={submit} autoFocus />
          <p className="pin-dialog-note">
            {name} will be logged out on their phone and log in with the new PIN.
          </p>
        </div>
      </Dialog>
    </>
  );
}
