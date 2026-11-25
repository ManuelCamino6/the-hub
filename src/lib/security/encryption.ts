
import "server-only";

import {
    randomBytes,
    createCipheriv,
    createDecipheriv,
} from "node:crypto";

const algorithm = "aes-256-gcm";

function getKey() {
    const value = process.env.INSTANCE_ENCRYPTION_KEY;

    if (!value) {
        throw new Error("Encryption key is missing.");
    }

    const key = Buffer.from(value, "base64");

    if (key.length !== 32) {
        throw new Error("Invalid encryption key.");
    }

    return key;
}

export function encrypt(
    value: string,
    context: string
): string {
    const iv = randomBytes(12);

    const cipher = createCipheriv(
        algorithm,
        getKey(),
        iv
    );

    cipher.setAAD(Buffer.from(context, "utf8"));

    const ciphertext = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return [
        "v1",
        iv.toString("base64url"),
        tag.toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");
}

export function decrypt(
    value: string,
    context: string
): string {
    const parts = value.split(".");

    if (parts.length !== 4 || parts[0] !== "v1") {
        throw new Error("Invalid encrypted value.");
    }

    const [, iv, tag, ciphertext] = parts;

    const decipher = createDecipheriv(
        algorithm,
        getKey(),
        Buffer.from(iv, "base64url"),
        { authTagLength: 16 }
    );

    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));

    return Buffer.concat([
        decipher.update(
            Buffer.from(ciphertext, "base64url")
        ),
        decipher.final(),
    ]).toString("utf8");
}
