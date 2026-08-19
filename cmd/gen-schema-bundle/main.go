// Command gen-schema-bundle writes internal/oecsspec/schema/bundled/charger.schema.json,
// a flattened, dependency-free version of internal/oecsspec/schema's per-concern OECS
// subschema files - see internal/oecsspec/schemabundle for how. Run after editing any file
// in internal/oecsspec/schema; internal/oecsspec/bundled_test.go fails if the checked-in
// bundle drifts from the sources.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/ChargePi/oecs-hub/internal/oecsspec/schemabundle"
)

const schemaDir = "internal/oecsspec/schema"

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	bundle, err := schemabundle.Bundle(os.DirFS(schemaDir))
	if err != nil {
		return err
	}

	out, err := json.MarshalIndent(bundle, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling bundle: %w", err)
	}
	out = append(out, '\n')

	outPath := filepath.Join(schemaDir, "bundled", schemabundle.RootFile)
	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return fmt.Errorf("creating bundled dir: %w", err)
	}

	if err := os.WriteFile(outPath, out, 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", outPath, err)
	}

	fmt.Println("wrote", outPath)

	return nil
}
