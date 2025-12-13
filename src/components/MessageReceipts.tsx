import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle, Clock } from '@phosphor-icons/react'

type ReceiptStatus = 'sent' | 'received' | 'decrypted'

type MessageReceipt = {
  username: string
  status: ReceiptStatus
  timestamp: number
}

type MessageReceiptsProps = {
  receipts: MessageReceipt[]
  totalPeers: number
}

export function MessageReceipts({ receipts, totalPeers }: MessageReceiptsProps) {
  if (totalPeers === 0) return null

  const decryptedCount = receipts.filter(r => r.status === 'decrypted').length
  const receivedCount = receipts.filter(r => r.status === 'received').length

  const getIcon = () => {
    if (decryptedCount === totalPeers) {
      return <CheckCircle size={14} className="text-green-400" weight="fill" />
    } else if (decryptedCount > 0 || receivedCount > 0) {
      return <CheckCircle size={14} className="text-yellow-400" weight="fill" />
    } else {
      return <Clock size={14} className="text-muted-foreground" weight="fill" />
    }
  }

  const getTooltipContent = () => {
    if (receipts.length === 0) {
      return <p className="text-xs">Waiting for delivery confirmations...</p>
    }

    const decrypted = receipts.filter(r => r.status === 'decrypted')
    const received = receipts.filter(r => r.status === 'received')

    return (
      <div className="space-y-2 max-w-xs">
        {decrypted.length > 0 && (
          <div>
            <p className="text-xs font-bold text-green-400 mb-1">
              Decrypted by {decrypted.length}:
            </p>
            <p className="text-xs text-muted-foreground">
              {decrypted.map(r => r.username).join(', ')}
            </p>
          </div>
        )}
        {received.length > 0 && (
          <div>
            <p className="text-xs font-bold text-yellow-400 mb-1">
              Received by {received.length}:
            </p>
            <p className="text-xs text-muted-foreground">
              {received.map(r => r.username).join(', ')}
            </p>
          </div>
        )}
        {decrypted.length + received.length < totalPeers && (
          <p className="text-xs text-muted-foreground">
            Waiting for {totalPeers - decrypted.length - received.length} peer(s)
          </p>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-2 inline-flex items-center gap-1">
            {getIcon()}
            {totalPeers > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                {decryptedCount}/{totalPeers}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover border-border">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export type { MessageReceipt, ReceiptStatus }
