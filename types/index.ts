// Crypto types
export type KeyPair = {
	publicKey: CryptoKey;
	privateKey: CryptoKey;
};

export type SerializedPublicKey = string;

// Connection types
export type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

// Server config
export type ServerConfig = {
	brokerUrl: string;
	port: number;
	topicPrefix: string;
};

// Message types
export type Message = {
	id: string;
	username: string;
	text: string;
	timestamp: number;
	receipts?: Map<string, MessageReceipt>;
};

export type EncryptedMessage = {
	id: string;
	username: string;
	encrypted: { [recipientKey: string]: string };
	timestamp: number;
	senderPublicKey: SerializedPublicKey;
};

// Receipt types
export type ReceiptStatus = "sent" | "received" | "decrypted";

export type MessageReceipt = {
	username: string;
	status: ReceiptStatus;
	timestamp: number;
};

export type DeliveryReceipt = {
	messageId: string;
	username: string;
	status: ReceiptStatus;
	timestamp: number;
};

// Typing types
export type TypingEvent = {
	username: string;
	isTyping: boolean;
	timestamp: number;
	publicKey: SerializedPublicKey;
};

// Peer types
export type PeerStatus = {
	username: string;
	hasPublicKey: boolean;
	lastSeen: number;
};

export type PeerPublicKey = {
	key: CryptoKey;
	serialized: SerializedPublicKey;
};

// Public key types
export type PublicKeyAnnouncement = {
	username: string;
	publicKey: SerializedPublicKey;
	timestamp: number;
};

export type PublicKeyRequest = {
	requesterId: string;
	timestamp: number;
};
