import { exportPublicKey, generateKeyPair } from "~/utils/crypto";

export function useChat() {
	const store = useChatStore();
	const mqtt = useMqtt();

	// Initialize the chat application
	async function initialize() {
		// Load persisted data
		store.loadFromStorage();

		// Initialize username if empty
		if (!store.username) {
			store.saveUsername(
				`Anonymous-${Math.random().toString(36).substring(2, 7)}`,
			);
		}

		// Generate key pair
		const keyPair = await generateKeyPair();
		const publicKeyString = await exportPublicKey(keyPair.publicKey);
		store.setKeyPair(keyPair, publicKeyString);

		// Connect to MQTT
		await mqtt.connect();

		// Start typing expiry checker
		startTypingExpiryChecker();
	}

	// Check for expired typing indicators
	let typingExpiryInterval: ReturnType<typeof setInterval> | null = null;

	function startTypingExpiryChecker() {
		typingExpiryInterval = setInterval(() => {
			store.clearExpiredTypingUsers();
		}, 1000);
	}

	function stopTypingExpiryChecker() {
		if (typingExpiryInterval) {
			clearInterval(typingExpiryInterval);
			typingExpiryInterval = null;
		}
	}

	// Handle server config save
	function handleServerConfigSave(config: typeof store.serverConfig) {
		store.saveConfig(config);
		mqtt.handleServerConfigChange();
		// Reconnect with new config
		nextTick(() => {
			mqtt.connect();
		});
	}

	// Handle reconnect
	function handleReconnect() {
		mqtt.reconnect();
	}

	// Handle username change
	function handleUsernameChange(newUsername: string) {
		if (newUsername.trim()) {
			store.saveUsername(newUsername.trim());
		}
	}

	// Handle manual key request
	function handleManualKeyRequest() {
		if (store.connectionStatus === "connected") {
			mqtt.requestPublicKeys();
		}
	}

	// Cleanup
	function cleanup() {
		stopTypingExpiryChecker();
		mqtt.disconnect();
	}

	// Helper functions
	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function getAvatarColor(username: string): string {
		const colors = [
			"bg-purple-500",
			"bg-cyan-500",
			"bg-pink-500",
			"bg-orange-500",
			"bg-green-500",
			"bg-blue-500",
			"bg-yellow-500",
			"bg-red-500",
		];
		const index =
			username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
			colors.length;
		return colors[index];
	}

	function getTypingText(): string | null {
		const users = Array.from(store.typingUsers.keys());
		if (users.length === 0) return null;
		if (users.length === 1) return `${users[0]} is typing...`;
		if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
		return `${users[0]}, ${users[1]}, and ${users.length - 2} others are typing...`;
	}

	return {
		// Store references
		store,
		mqtt,

		// Actions
		initialize,
		cleanup,
		handleServerConfigSave,
		handleReconnect,
		handleUsernameChange,
		handleManualKeyRequest,

		// Helpers
		formatTimestamp,
		getAvatarColor,
		getTypingText,
	};
}
