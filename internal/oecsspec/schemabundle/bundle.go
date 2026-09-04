// Package schemabundle flattens the OECS schema set's per-concern subschema files
// (linked by cross-file $ref, mirroring the upstream https://github.com/xBlaz3kx/oecs
// layout) into a single self-contained document with every $ref rewritten to a local
// "#/$defs/<namespace>/..." pointer. See cmd/gen-schema-bundle for the CLI that writes the
// checked-in artifact this produces, and internal/oecsspec/bundled_test.go for the drift/
// validity check against it.
package schemabundle

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"strings"
)

// RootFile is the entry-point subschema that references every other file.
const RootFile = "charger.schema.json"

// SubFiles are every other subschema file RootFile (transitively) references, whose
// $defs get merged into the bundle's own $defs, namespaced by Namespace.
var SubFiles = []string{
	"common.schema.json",
	"connector.schema.json",
	"hardware.schema.json",
	"manufacturer.schema.json",
	"metadata.schema.json",
	"payment.schema.json",
	"pricing.schema.json",
	"software.schema.json",
}

// Namespace derives the $defs namespace a subschema file's own definitions are merged
// under, e.g. "common.schema.json" -> "common".
func Namespace(file string) string {
	return strings.TrimSuffix(file, ".schema.json")
}

// Bundle reads RootFile and SubFiles from dir and returns the flattened, self-contained
// schema document: RootFile's own top-level keys (properties/required/etc., refs rewritten)
// plus a merged "$defs" object namespacing every SubFile's own $defs under its basename.
func Bundle(dir fs.FS) (map[string]any, error) {
	load := func(file string) (map[string]any, error) {
		raw, err := fs.ReadFile(dir, file)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", file, err)
		}

		var doc map[string]any
		if err := json.Unmarshal(raw, &doc); err != nil {
			return nil, fmt.Errorf("unmarshaling %s: %w", file, err)
		}

		return doc, nil
	}

	root, err := load(RootFile)
	if err != nil {
		return nil, err
	}

	bundle, ok := rewriteRefs(root, "").(map[string]any)
	if !ok {
		return nil, fmt.Errorf("%s: root document is not a JSON object", RootFile)
	}

	defs := make(map[string]any, len(SubFiles))
	for _, file := range SubFiles {
		doc, err := load(file)
		if err != nil {
			return nil, err
		}

		d, ok := doc["$defs"]
		if !ok {
			return nil, fmt.Errorf("%s: expected a $defs object, has none", file)
		}

		defs[Namespace(file)] = rewriteRefs(d, Namespace(file))
	}
	bundle["$defs"] = defs

	return bundle, nil
}

// rewriteRefs walks an arbitrary decoded-JSON value, rewriting every "$ref" string it finds.
// ns is the $defs namespace of the document v was taken from, used to resolve refs of the
// form "#/$defs/X" (relative to the document's own, not-yet-namespaced $defs).
func rewriteRefs(v any, ns string) any {
	switch val := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(val))
		for k, vv := range val {
			if k == "$ref" {
				if s, ok := vv.(string); ok {
					out[k] = rewriteRef(s, ns)
					continue
				}
			}
			out[k] = rewriteRefs(vv, ns)
		}
		return out
	case []any:
		out := make([]any, len(val))
		for i, vv := range val {
			out[i] = rewriteRefs(vv, ns)
		}
		return out
	default:
		return val
	}
}

// rewriteRef rewrites one $ref value. The OECS schema set only ever uses two forms (verified
// against every $ref in internal/oecsspec/schema at the time this was written): a same-file
// pointer ("#/$defs/X") or a cross-file pointer ("otherfile.schema.json#/$defs/X"). Anything
// else means the source schemas grew a new $ref shape this bundler doesn't know how to
// flatten - fail loudly rather than silently emit a broken bundle.
func rewriteRef(ref, ns string) string {
	if rest, ok := strings.CutPrefix(ref, "#/$defs/"); ok {
		return "#/$defs/" + ns + "/" + rest
	}

	const marker = ".schema.json#/$defs/"
	if idx := strings.Index(ref, marker); idx != -1 {
		file := ref[:idx]
		rest := ref[idx+len(marker):]
		return "#/$defs/" + file + "/" + rest
	}

	panic(fmt.Sprintf("schemabundle: unrecognized $ref format %q - update rewriteRef", ref))
}
