import { Button } from "@/components/ui";
import type { FormMode } from "@/types/forms";

interface SupplyFormActionsProps {
  mode: FormMode;
  submitting: boolean;
  onCancel?: () => void;
}

export function SupplyFormActions({
  mode,
  submitting,
  onCancel,
}: SupplyFormActionsProps) {
  const getButtonText = () => {
    if (submitting) {
      return mode === "add" ? "登録中..." : "更新中...";
    }
    return mode === "add" ? "登録" : "更新";
  };

  return (
    <div className='flex flex-col sm:flex-row gap-3 mt-6'>
      <Button
        fullWidth
        disabled={submitting}
        loading={submitting}
        size='lg'
        type='submit'
        variant='primary'
      >
        {getButtonText()}
      </Button>

      {onCancel && (
        <Button
          className='sm:w-auto'
          disabled={submitting}
          size='lg'
          type='button'
          variant='outline'
          onClick={onCancel}
        >
          キャンセル
        </Button>
      )}
    </div>
  );
}
