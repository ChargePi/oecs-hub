package promptsuggestion

import (
	"bytes"
	_ "embed"
	"fmt"
	"text/template"
)

//go:embed prompts/general_system.tmpl
var generalSystemPrompt string

//go:embed prompts/general_user.tmpl
var generalUserTemplateSrc string

//go:embed prompts/chargers_system.tmpl
var chargersSystemPrompt string

//go:embed prompts/chargers_user.tmpl
var chargersUserTemplateSrc string

//go:embed prompts/comparison_system.tmpl
var comparisonSystemPrompt string

//go:embed prompts/comparison_user.tmpl
var comparisonUserTemplateSrc string

var (
	generalUserTemplate    = template.Must(template.New("general_user").Parse(generalUserTemplateSrc))
	chargersUserTemplate   = template.Must(template.New("chargers_user").Parse(chargersUserTemplateSrc))
	comparisonUserTemplate = template.Must(template.New("comparison_user").Parse(comparisonUserTemplateSrc))
)

func renderTemplate(tmpl *template.Template, data any) (string, error) {
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("render %s: %w", tmpl.Name(), err)
	}

	return buf.String(), nil
}
