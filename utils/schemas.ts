import { z } from "zod";

// Message schemas
export const EncryptedMessageSchema = z.object({
	id: z.string(),
	username: z.string(),
	encrypted: z.record(z.string()),
	timestamp: z.number(),
	senderPublicKey: z.string(),
});

export const TypingEventSchema = z.object({
	username: z.string(),
	isTyping: z.boolean(),
	timestamp: z.number(),
	publicKey: z.string(),
});

export const PublicKeyAnnouncementSchema = z.object({
	username: z.string(),
	publicKey: z.string(),
	timestamp: z.number(),
});

export const PublicKeyRequestSchema = z.object({
	requesterId: z.string(),
	timestamp: z.number(),
});

export const DeliveryReceiptSchema = z.object({
	messageId: z.string(),
	username: z.string(),
	status: z.enum(["sent", "received", "decrypted"]),
	timestamp: z.number(),
});
