package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

var defaultMasterSecret = "concord-router-secret-key-32bytes!!"

func getEncryptionKey() []byte {
	secret := os.Getenv("CONCORD_ENCRYPTION_KEY")
	if secret == "" {
		secret = defaultMasterSecret
	}
	hash := sha256.Sum256([]byte(secret))
	return hash[:]
}

// Encrypt encrypts plaintext using AES-256-GCM and returns base64 encoded ciphertext
func Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key := getEncryptionKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts base64 encoded ciphertext using AES-256-GCM
func Decrypt(encryptedBase64 string) (string, error) {
	if encryptedBase64 == "" {
		return "", nil
	}
	data, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", err
	}

	key := getEncryptionKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintextBytes, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintextBytes), nil
}

// MaskKey returns a masked preview of a secret key (e.g., "sk-ant-...4x9f")
func MaskKey(key string) string {
	if len(key) <= 8 {
		return "••••••••"
	}
	prefixLen := 6
	if len(key) < 12 {
		prefixLen = 3
	}
	suffixLen := 4
	return key[:prefixLen] + "..." + key[len(key)-suffixLen:]
}
