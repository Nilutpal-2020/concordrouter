package crypto

import (
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	testKeys := []string{
		"sk-ant-api03-abcdef1234567890",
		"sk-proj-openai987654321",
		"AIzaSyD-GoogleKey12345",
		"simple-key",
	}

	for _, original := range testKeys {
		encrypted, err := Encrypt(original)
		if err != nil {
			t.Fatalf("Encrypt failed for %s: %v", original, err)
		}
		if encrypted == original {
			t.Fatalf("Encrypted text should not equal original plaintext")
		}

		decrypted, err := Decrypt(encrypted)
		if err != nil {
			t.Fatalf("Decrypt failed for %s: %v", original, err)
		}
		if decrypted != original {
			t.Fatalf("Decrypted text %s does not match original %s", decrypted, original)
		}
	}
}

func TestMaskKey(t *testing.T) {
	masked := MaskKey("sk-ant-api03-abcdef1234567890")
	if len(masked) == 0 || masked == "sk-ant-api03-abcdef1234567890" {
		t.Fatalf("MaskKey failed: got %s", masked)
	}
}
