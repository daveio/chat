import type { KeyPair, SerializedPublicKey } from "~/types";

export async function generateKeyPair(): Promise<KeyPair> {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: "ECDH",
			namedCurve: "P-256",
		},
		true,
		["deriveKey", "deriveBits"],
	);

	return {
		publicKey: keyPair.publicKey,
		privateKey: keyPair.privateKey,
	};
}

export async function exportPublicKey(
	publicKey: CryptoKey,
): Promise<SerializedPublicKey> {
	const exported = await crypto.subtle.exportKey("spki", publicKey);
	return arrayBufferToBase64(exported);
}

export async function importPublicKey(
	serialized: SerializedPublicKey,
): Promise<CryptoKey> {
	const keyData = base64ToArrayBuffer(serialized);
	return crypto.subtle.importKey(
		"spki",
		keyData,
		{
			name: "ECDH",
			namedCurve: "P-256",
		},
		true,
		[],
	);
}

async function deriveSharedKey(
	privateKey: CryptoKey,
	publicKey: CryptoKey,
): Promise<CryptoKey> {
	return crypto.subtle.deriveKey(
		{
			name: "ECDH",
			public: publicKey,
		},
		privateKey,
		{
			name: "AES-GCM",
			length: 256,
		},
		false,
		["encrypt", "decrypt"],
	);
}

export async function encryptMessage(
	message: string,
	myPrivateKey: CryptoKey,
	recipientPublicKeys: CryptoKey[],
): Promise<string[]> {
	const encoder = new TextEncoder();
	const messageData = encoder.encode(message);

	const encrypted: string[] = [];

	for (let i = 0; i < recipientPublicKeys.length; i++) {
		const recipientPublicKey = recipientPublicKeys[i];
		const sharedKey = await deriveSharedKey(myPrivateKey, recipientPublicKey);

		const iv = crypto.getRandomValues(new Uint8Array(12));

		const ciphertext = await crypto.subtle.encrypt(
			{
				name: "AES-GCM",
				iv: iv,
			},
			sharedKey,
			messageData,
		);

		const combined = new Uint8Array(iv.length + ciphertext.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(ciphertext), iv.length);

		encrypted.push(arrayBufferToBase64(combined.buffer));
	}

	return encrypted;
}

export async function decryptMessage(
	encryptedData: string,
	myPrivateKey: CryptoKey,
	senderPublicKey: CryptoKey,
): Promise<string> {
	const combined = base64ToArrayBuffer(encryptedData);
	const iv = combined.slice(0, 12);
	const ciphertext = combined.slice(12);

	const sharedKey = await deriveSharedKey(myPrivateKey, senderPublicKey);

	const decrypted = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		sharedKey,
		ciphertext,
	);

	const decoder = new TextDecoder();
	return decoder.decode(decrypted);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const chunks: string[] = [];
	const chunkSize = 0x8000; // Process in 32KB chunks to avoid call stack limits

	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
		chunks.push(String.fromCharCode(...chunk));
	}

	return btoa(chunks.join(""));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}
