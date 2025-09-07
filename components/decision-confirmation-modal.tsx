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
  story: string
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
  currentStats?: {
    morale: number
    resources: number
    condition: number
  }
}

export function DecisionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  choice,
  isSubmitting,
  currentStats
}: DecisionConfirmationModalProps) {
  if (!choice) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Your Decision</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to make this decision? This action cannot be undone.
          </AlertDialogDescription>
          {choice.decision_description && (
            <div className="text-sm text-muted-foreground mt-4 p-4 bg-muted/50 rounded">
              {choice.decision_description}
            </div>
          )}
          
          {/* Impact Preview */}
          {currentStats && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-semibold mb-3">Impact of this decision:</p>
              <div className="space-y-2">
                {choice.morale !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Morale:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{Math.round(currentStats.morale * 100)}%</span>
                      <span>→</span>
                      <span className={choice.morale > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.round((currentStats.morale + choice.morale) * 100)}%
                      </span>
                      <span className={`ml-2 font-medium ${choice.morale > 0 ? "text-green-600" : "text-red-600"}`}>
                        ({choice.morale > 0 ? '+' : ''}{Math.round(choice.morale * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
                {choice.resources !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Resources:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{currentStats.resources}</span>
                      <span>→</span>
                      <span className={choice.resources > 0 ? "text-green-600" : "text-red-600"}>
                        {currentStats.resources + choice.resources}
                      </span>
                      <span className={`ml-2 font-medium ${choice.resources > 0 ? "text-green-600" : "text-red-600"}`}>
                        ({choice.resources > 0 ? '+' : ''}{choice.resources})
                      </span>
                    </div>
                  </div>
                )}
                {choice.condition !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Condition:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{Math.round(currentStats.condition * 100)}%</span>
                      <span>→</span>
                      <span className={choice.condition > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.round((currentStats.condition + choice.condition) * 100)}%
                      </span>
                      <span className={`ml-2 font-medium ${choice.condition > 0 ? "text-green-600" : "text-red-600"}`}>
                        ({choice.condition > 0 ? '+' : ''}{Math.round(choice.condition * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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