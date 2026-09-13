// Command admin-cli is the only supported way to create an OECS Hub "admin" Kratos
// identity. It is never exposed to end users - it talks directly to Kratos's and Keto's
// admin-only APIs, which are not routed through Traefik.
package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"

	"github.com/ChargePi/oecs-hub/internal/keto"
	"github.com/ChargePi/oecs-hub/internal/kratos"
)

func main() {
	email := flag.String("email", "", "admin's email address (required to create a new admin)")
	name := flag.String("name", "", "admin's first name (required to create a new admin)")
	surname := flag.String("surname", "", "admin's surname (required to create a new admin)")
	grantRoleOnly := flag.String("grant-role-only", "", "identity ID to (re)grant the admin Keto role for, without creating a new identity - use this to repair a run that created the identity but failed to grant the role")
	flag.Parse()

	kratosAdminURL := os.Getenv("OECS_HUB_KRATOS_ADMIN_URL")
	ketoWriteURL := os.Getenv("OECS_HUB_KETO_WRITE_URL")
	if kratosAdminURL == "" || ketoWriteURL == "" {
		log.Fatal("OECS_HUB_KRATOS_ADMIN_URL and OECS_HUB_KETO_WRITE_URL are both required")
	}

	ctx := context.Background()
	ketoClient := keto.NewClient(ketoWriteURL)

	if *grantRoleOnly != "" {
		id, err := uuid.Parse(*grantRoleOnly)
		if err != nil {
			log.Fatalf("invalid --grant-role-only identity ID: %v", err)
		}

		if err := ketoClient.GrantAdminRole(ctx, id); err != nil {
			log.Fatalf("granting admin role to %s failed: %v", id, err)
		}

		fmt.Printf("Granted admin role to identity %s\n", id)
		return
	}

	if *email == "" || *name == "" || *surname == "" {
		log.Fatal("--email, --name and --surname are all required (or use --grant-role-only)")
	}

	password, err := generatePassword()
	if err != nil {
		log.Fatalf("failed to generate a password: %v", err)
	}

	kratosClient := kratos.NewSDKClient(kratosAdminURL)
	id, err := kratosClient.CreateAdminIdentity(ctx, kratos.CreateAdminIdentityParams{
		Email:    *email,
		Name:     *name,
		Surname:  *surname,
		Password: password,
	})
	if err != nil {
		log.Fatalf("failed to create admin identity: %v", err)
	}

	if err := ketoClient.GrantAdminRole(ctx, id); err != nil {
		log.Fatalf("identity %s (%s) was created but granting the admin role failed: %v\nrerun with -grant-role-only=%s once fixed", id, *email, err, id)
	}

	fmt.Printf("Created admin identity %s (%s)\n", id, *email)
	fmt.Printf("One-time password (not stored, will not be shown again): %s\n", password)
}

// generatePassword returns a cryptographically random, URL-safe password with enough
// entropy to clear Kratos's default password policy on the first try.
func generatePassword() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(buf), nil
}
