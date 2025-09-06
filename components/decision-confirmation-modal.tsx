import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface NextChoice {
  id: number
  decision_id: string
  decision_title: string
  decision_description: string
  decision_text: string
  condition: number
  morale: number
  resources: number
  decision_number: number
  choice: string
}

interface DecisionConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  choice: NextChoice | null
  isSubmitting: boolean
}

export function DecisionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  choice,
  isSubmitting
}: DecisionConfirmationModalProps) {
  if (!choice) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Your Decision</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {choice.decision_description && (
              <div className="text-sm text-muted-foreground">
                {choice.decision_description}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Are you sure you want to make this decision? This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col space-y-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full bg-black hover:bg-gray-800"
          >
            {isSubmitting ? "Making Decision..." : "Confirm Decision"}
          </AlertDialogAction>
          <AlertDialogCancel disabled={isSubmitting} className="w-full">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 