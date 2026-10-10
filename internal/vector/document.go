package vector

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"text/template"

	"github.com/ChargePi/oecs-hub/internal/oecsspec"
)

//go:embed templates/charger_document.tmpl
var chargerDocumentSource string

var chargerDocumentTemplate = template.Must(template.New("charger_document").Funcs(template.FuncMap{
	"join": joinValues,
	"qty":  formatQuantity,
	"is":   isTrue,
}).Parse(chargerDocumentSource))

// chargerDocument renders the text embedded for a charger from its raw OECS spec.
func chargerDocument(rawSpec []byte) (string, error) {
	var spec oecsspec.Charger
	if err := json.Unmarshal(rawSpec, &spec); err != nil {
		return "", fmt.Errorf("unmarshal spec: %w", err)
	}

	var rendered strings.Builder
	if err := chargerDocumentTemplate.Execute(&rendered, &spec); err != nil {
		return "", fmt.Errorf("render charger document: %w", err)
	}

	lines := make([]string, 0)

	for line := range strings.SplitSeq(rendered.String(), "\n") {
		line = strings.Join(strings.Fields(line), " ")
		if line != "" {
			lines = append(lines, line)
		}
	}

	return strings.Join(lines, "\n"), nil
}

func joinValues(values []string) string {
	return strings.Join(values, ", ")
}

func formatQuantity(q *oecsspec.Quantity) string {
	if q == nil {
		return ""
	}

	return strconv.FormatFloat(q.Value, 'f', -1, 64) + " " + q.Unit
}

func isTrue(b *bool) bool {
	return b != nil && *b
}
