import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AlertDialogConfirmation2Props = {
  onContinue: () => void | Promise<void>;
  evaluating?: boolean;
  triggerDisabled?: boolean;
};

const AlertDialogConfirmation2 = ({
  onContinue,
  evaluating = false,
  triggerDisabled = false,
}: AlertDialogConfirmation2Props) => {
  const [open, setOpen] = useState(false);

  const handleContinue = () => {
    setOpen(false);
    void onContinue();
  };

  return (
  <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger
      render={(
        <button
          type="button"
          className="btn btn-sm"
          style={{
            borderColor: '#d97706',
            background: 'color-mix(in srgb, var(--bg-elev) 84%, #f59e0b 16%)',
            color: 'var(--text)',
          }}
          disabled={triggerDisabled}
        />
      )}
    >
      Evaluate Test
    </AlertDialogTrigger>
    <AlertDialogContent
      style={{
        background: 'var(--bg-elev)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <AlertDialogHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5 text-amber-500" />
          <AlertDialogTitle>Continue Evaluation?</AlertDialogTitle>
        </div>
        <AlertDialogDescription style={{ color: 'var(--muted)' }}>
          Would you like to continue? Evaluations will take some time, and once
          evaluated, new candidates cannot be added or evaluated.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter
        style={{
          borderTop: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--bg-elev) 92%, transparent)',
        }}
      >
        <AlertDialogCancel className="btn btn-sm btn-outline-secondary">Go Back</AlertDialogCancel>
        <AlertDialogAction
          className="btn btn-sm"
          style={{
            borderColor: '#b45309',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
          }}
          onClick={handleContinue}
          disabled={evaluating}
        >
          {evaluating ? 'Evaluating…' : 'Continue'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  );
};

export default AlertDialogConfirmation2;
