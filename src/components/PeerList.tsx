import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle, ArrowClockwise } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type PeerStatus = {
  username: string
  hasPublicKey: boolean
  lastSeen: number
}

type PeerListProps = {
  peers: Map<string, PeerStatus>
  onRequestKeys: () => void
  disabled?: boolean
}

export function PeerList({ peers, onRequestKeys, disabled }: PeerListProps) {
  const peerArray = Array.from(peers.values()).sort((a, b) => {
    if (a.hasPublicKey !== b.hasPublicKey) {
      return a.hasPublicKey ? -1 : 1
    }
    return a.username.localeCompare(b.username)
  })

  const peersWithKeys = peerArray.filter(p => p.hasPublicKey).length
  const peersWithoutKeys = peerArray.filter(p => !p.hasPublicKey).length

  return (
    <Card className="bg-card border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-sm font-bold text-primary uppercase tracking-wide">
            Peers
          </h3>
          <Badge variant="outline" className="font-mono text-xs">
            {peerArray.length} total
          </Badge>
        </div>
        <Button
          onClick={onRequestKeys}
          disabled={disabled}
          size="sm"
          variant="outline"
          className="font-mono text-xs"
        >
          <ArrowClockwise size={14} className="mr-1.5" />
          Request Keys
        </Button>
      </div>

      <div className="flex gap-2 text-xs font-mono">
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle size={12} className="mr-1" weight="fill" />
          {peersWithKeys} secured
        </Badge>
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle size={12} className="mr-1" weight="fill" />
          {peersWithoutKeys} unsecured
        </Badge>
      </div>

      <ScrollArea className="h-32">
        <div className="space-y-1.5">
          {peerArray.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono text-center py-4">
              No peers detected yet
            </p>
          ) : (
            peerArray.map((peer) => (
              <motion.div
                key={peer.username}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-mono text-foreground truncate">
                  {peer.username}
                </span>
                {peer.hasPublicKey ? (
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0" weight="fill" />
                ) : (
                  <XCircle size={16} className="text-red-400 flex-shrink-0" weight="fill" />
                )}
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

export type { PeerStatus }
