import { Gear } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServerConfig = {
	brokerUrl: string;
	port: number;
	topicPrefix: string;
};

type ServerSettingsProps = {
	config: ServerConfig;
	onSave: (config: ServerConfig) => void;
	disabled?: boolean;
};

export function ServerSettings({
	config,
	onSave,
	disabled,
}: ServerSettingsProps) {
	const [open, setOpen] = useState(false);
	const [brokerUrl, setBrokerUrl] = useState(config.brokerUrl);
	const [port, setPort] = useState(config.port.toString());
	const [topicPrefix, setTopicPrefix] = useState(config.topicPrefix);

	const handleSave = () => {
		const portNum = parseInt(port, 10);
		if (
			!brokerUrl.trim() ||
			isNaN(portNum) ||
			portNum <= 0 ||
			!topicPrefix.trim()
		) {
			return;
		}

		onSave({
			brokerUrl: brokerUrl.trim(),
			port: portNum,
			topicPrefix: topicPrefix.trim(),
		});
		setOpen(false);
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (newOpen) {
			setBrokerUrl(config.brokerUrl);
			setPort(config.port.toString());
			setTopicPrefix(config.topicPrefix);
		}
		setOpen(newOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="font-mono text-xs"
					disabled={disabled}
				>
					<Gear size={14} className="mr-1.5" />
					Settings
				</Button>
			</DialogTrigger>
			<DialogContent className="bg-card border-border">
				<DialogHeader>
					<DialogTitle className="font-mono text-primary">
						MQTT Server Settings
					</DialogTitle>
					<DialogDescription className="font-mono text-sm text-muted-foreground">
						Configure your MQTT broker connection. Changes will reconnect the
						client.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="broker-url" className="font-mono text-sm">
							Broker URL
						</Label>
						<Input
							id="broker-url"
							value={brokerUrl}
							onChange={(e) => setBrokerUrl(e.target.value)}
							placeholder="wss://test.mosquitto.org"
							className="font-mono text-sm"
						/>
						<p className="text-xs text-muted-foreground font-mono">
							WebSocket URL (wss:// or ws://)
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="port" className="font-mono text-sm">
							Port
						</Label>
						<Input
							id="port"
							type="number"
							value={port}
							onChange={(e) => setPort(e.target.value)}
							placeholder="8081"
							className="font-mono text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="topic-prefix" className="font-mono text-sm">
							Topic Prefix
						</Label>
						<Input
							id="topic-prefix"
							value={topicPrefix}
							onChange={(e) => setTopicPrefix(e.target.value)}
							placeholder="spark-chat-room"
							className="font-mono text-sm"
						/>
						<p className="text-xs text-muted-foreground font-mono">
							Used for private channels (e.g., "my-private-room")
						</p>
					</div>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						className="font-mono text-xs"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						className="bg-accent hover:bg-accent/90 text-accent-foreground font-mono text-xs"
					>
						Save & Reconnect
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export type { ServerConfig };
